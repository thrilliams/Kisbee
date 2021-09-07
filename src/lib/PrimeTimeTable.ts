import Collection from '@discordjs/collection';
import fetch from 'node-fetch';
import { string, z } from 'zod';

// Typings for raw PrimeTimeTable REST API
export const Table = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    published: z.boolean(),
    createdAt: z.string().transform(string => new Date(string)),
    updatedAt: z.string().transform(string => new Date(string)),
    schoolId: z.string().uuid(),
    schoolName: z.string(),
    year: z.string(),
    version: z.string(),
    css: z.string(),
    creatorId: z.string().uuid(),
    editorId: z.string().uuid(),
    days: z.object({
        id: z.string().uuid(),
        position: z.number().nonnegative().int(),
        name: z.string(),
        shortName: z.string()
    }).array(),
    periods: z.object({
        id: z.string().uuid(),
        position: z.number().nonnegative().int(),
        name: z.string(),
        shortName: z.string(),
        startHour: z.number().positive().int().lte(23),
        startMinute: z.number().positive().int().lte(59).optional(),
        endHour: z.number().positive().int().lte(23),
        endMinute: z.number().positive().int().lte(59).optional()
    }).array(),
    subjects: z.object({
        id: z.string().uuid(),
        position: z.number().nonnegative().int(),
        name: z.string(),
        shortName: z.string(),
        color: z.string()
    }).array(),
    teachers: z.object({
        id: z.string().uuid(),
        position: z.number().nonnegative().int(),
        name: z.string(),
        shortName: z.string(),
        color: z.string()
    }).array(),
    classes: z.object({
        id: z.string().uuid(),
        position: z.number().nonnegative().int(),
        name: z.string(),
        shortName: z.string(),
        color: z.string(),
        groupSets: z.object({
            id: z.string().uuid(),
            position: z.number().nonnegative().int().optional(),
            groups: z.object({
                id: z.string().uuid(),
                position: z.number().nonnegative().int().optional(),
                name: z.string().optional(),
                shortName: z.string().optional()
            }).array()
        }).array()
    }).array(),
    activities: z.object({
        id: z.string().uuid(),
        subjectId: z.string().uuid(),
        teacherIds: z.string().uuid().array().optional(),
        groupIds: z.string().uuid().array().optional(),
        length: z.number().positive().int().optional(),
        cards: z.object({
            id: z.string().uuid(),
            dayId: z.string().uuid().optional(),
            periodId: z.string().uuid().optional()
        }).array()
    }).array(),
    cardStyles: z.object({
        id: z.string().uuid(),
        individual: z.boolean().optional(),
        backgroundType: z.number().positive().int(),
        lengthTypes: z.number().nonnegative().int().array().length(2),
        entityTypes: z.number().nonnegative().int().array().length(2)
    }).array()
});

export type Table = z.infer<typeof Table>;

// Typings for internal PrimeTimeTable storage model
interface Base {
    id: string,
    position: number,
    name: string,
    shortName: string
}

export interface Day extends Base { }

export interface Period extends Base {
    startHour: number,
    startMinute?: number,
    endHour: number,
    endMinute?: number
}

export interface Subject extends Base {
    color: string,
    students?: Collection<string, Student>
}

export interface Teacher extends Subject { }

export interface Group {
    id: string,
    position?: number,
    name?: string,
    shortName?: string
}

export interface GroupSet {
    id: string,
    position?: number,
    groups: Collection<string, Group>
}

export interface Student extends Base {
    color: string,
    groupSets: Collection<string, GroupSet>,
    subjects?: Collection<string, Subject>
}

export interface Card {
    id: string,
    dayId?: string,
    periodId?: string
}

export interface Activity {
    id: string,
    subjectId: string,
    teacherIds?: string[],
    groupIds?: string[],
    length?: number,
    cards: Collection<string, Card>
}

export interface CardStyle {
    id: string,
    individual?: boolean,
    backgroundType: number,
    lengthTypes: number[],
    entityTypes: number[]
}

function arrayToCollection<Type extends { id: string }>(array: Type[]): Collection<string, Type> {
    const collection = new Collection<string, Type>();
    for (let item of array) {
        collection.set(item.id, item);
    }
    return collection;
}

// Handler for internal PrimeTimeTable storage model

interface SubjectGroup {
    name: string,
    ids: string[],
    students: Collection<string, Student>
}

export class PrimeTimeTable {
    private static instance: PrimeTimeTable;

    id!: string;

    name!: string;
    description!: string;
    published!: boolean;
    createdAt!: Date;
    updatedAt!: Date;
    schoolId!: string;
    schoolName!: string;
    year!: string;
    version!: string;
    css!: string;
    creatorId!: string;
    editorId!: string;
    days!: Collection<string, Day>;
    periods!: Collection<string, Period>;
    subjects!: Collection<string, Subject>;
    teachers!: Collection<string, Teacher>;
    students!: Collection<string, Student>;
    activities!: Collection<string, Activity>;
    cardStyles!: Collection<string, CardStyle>;

    constructor(id?: string) {
        if (PrimeTimeTable.instance) {
            return PrimeTimeTable.instance;
        }

        this.id = id!;
        PrimeTimeTable.instance = this;
    }

    private getApiUrl(tableId: string) {
        return `https://primetimetable.com/api/v2/timetables/${tableId}/`;
    }

    async initialize() {
        try {
            const response = await fetch(this.getApiUrl(this.id));
            const json = await response.json();
            const table = Table.parse(json);

            this.id = table.id;
            this.name = table.name;
            this.description = table.description;
            this.published = table.published;
            this.createdAt = table.createdAt;
            this.updatedAt = table.updatedAt;
            this.schoolId = table.schoolId;
            this.schoolName = table.schoolName;
            this.year = table.year;
            this.version = table.version;
            this.css = table.css;
            this.creatorId = table.creatorId;
            this.editorId = table.editorId;

            this.days = arrayToCollection<Day>(table.days);
            this.periods = arrayToCollection<Period>(table.periods);
            this.subjects = arrayToCollection<Subject>(table.subjects);
            this.teachers = arrayToCollection<Teacher>(table.teachers);
            this.students = arrayToCollection<Student>(table.classes.map(student => ({
                ...student,
                groupSets: arrayToCollection<GroupSet>(student.groupSets.map(groupSet => ({
                    ...groupSet,
                    groups: arrayToCollection<Group>(groupSet.groups)
                })))
            })));
            this.activities = arrayToCollection<Activity>(table.activities.map(activity => ({
                ...activity,
                cards: arrayToCollection<Card>(activity.cards)
            })));
            this.cardStyles = arrayToCollection<CardStyle>(table.cardStyles);
        } catch (e) {
            console.log((e as any).issues)
        }
    }

    expandSubject(subject: Subject, update = true):
        Subject & { students: Collection<string, Student> } {
        if (subject.students !== undefined) return { ...subject, students: subject.students };

        let students: Student[] = [];
        for (let activity of this.activities.values()) {
            if (activity.subjectId === subject.id && activity.groupIds !== undefined) {
                for (let id of activity.groupIds) {
                    for (let student of this.students.values()) {
                        for (let groupSet of student.groupSets.values()) {
                            for (let group of groupSet.groups.values()) {
                                if (id === group.id) {
                                    students.push(student);
                                }
                            }
                        }
                    }
                }
            }
        }

        subject = { ...subject, students: arrayToCollection<Student>(students) }
        if (update) this.subjects.set(subject.id, subject);

        return { ...subject, students: subject.students! };
    }

    expandStudent(student: Student, update = true): Student {
        if (student.subjects) return student;

        let subjects: Subject[] = [];
        for (let groupSet of student.groupSets.values()) {
            for (let group of groupSet.groups.values()) {
                for (let activity of this.activities.values()) {
                    if (activity.groupIds !== undefined && activity.groupIds.includes(group.id)) {
                        subjects.push(this.subjects.get(activity.subjectId)!);
                    }
                }
            }
        }

        student = {
            ...student,
            subjects: arrayToCollection<Subject>(subjects)
        }

        if (update) this.students.set(student.id, student);

        return student;
    }

    groupSections() {
        let groups: SubjectGroup[] = [];

        for (let subject of this.subjects.values()) {
            let name = /^[^()]*/gm.exec(subject.name)![0].trim();

            let noMatch = true;

            for (let group of groups) {
                if (group.name === name) {
                    group.ids.push(subject.id);
                    group.students.concat(this.expandSubject(subject).students!);
                    noMatch = false;
                }
            }

            if (noMatch) {
                groups.push({
                    name: name,
                    ids: [subject.id],
                    students: this.expandSubject(subject).students
                });
            }
        }

        return groups;
    }

    filterSections(min = 3, max = 65) {
        let groups = this.groupSections();
        groups = groups.filter(group => min < group.students.size && group.students.size < max);
        return groups;
    }
}

export default PrimeTimeTable;