import Collection from '@discordjs/collection';

// Typings for raw PrimeTimeTable REST API
export interface Table {
    id: string,
    name: string,
    description: string,
    published: boolean,
    createdAt: string,
    updatedAt: string,
    schoolId: string,
    schoolName: string,
    year: string,
    version: string,
    css: string,
    creatorId: string,
    editorId: string,
    days: {
        id: string,
        position: number,
        name: string,
        shortName: string
    }[],
    periods: {
        id: string,
        position: number,
        name: string,
        shortName: string,
        startHour: number,
        startMinute?: number,
        endHour: number,
        endMinute?: number
    }[],
    subjects: {
        id: string,
        position: number,
        name: string,
        shortName: string,
        color: string
    }[],
    teachers: {
        id: string,
        position: number,
        name: string,
        shortName: string,
        color: string
    }[],
    classes: {
        id: string,
        position: number,
        name: string,
        shortName: string,
        color: string,
        groupSets: {
            id: string,
            position?: number,
            groups: {
                id: string,
                position?: number,
                name?: string,
                shortName?: string
            }[]
        }[]
    }[],
    activities: {
        id: string,
        subjectId: string,
        teacherIds?: string[],
        groupIds: string[],
        length?: number,
        cards: {
            id: string,
            dayId: string,
            periodId: string
        }[]
    }[],
    cardStyles: {
        id: string,
        individual?: boolean,
        backgroundType: number,
        lengthTypes: number[],
        entityTypes: number[]
    }[]
}

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
    dayId: string,
    periodId: string
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
export class PrimeTimeTable {
    id: string;
    name: string;
    description: string;
    published: boolean;
    createdAt: Date;
    updatedAt: Date;
    schoolId: string;
    schoolName: string;
    year: string;
    version: string;
    css: string;
    creatorId: string;
    editorId: string;
    days: Collection<string, Day>;
    periods: Collection<string, Period>;
    subjects: Collection<string, Subject>;
    teachers: Collection<string, Teacher>;
    students: Collection<string, Student>;
    activities: Collection<string, Activity>;
    cardStyles: Collection<string, CardStyle>;

    constructor(json: Table) {
        this.id = json.id;
        this.name = json.name;
        this.description = json.description;
        this.published = json.published;
        this.createdAt = new Date(json.createdAt);
        this.updatedAt = new Date(json.updatedAt);
        this.schoolId = json.schoolId;
        this.schoolName = json.schoolName;
        this.year = json.year;
        this.version = json.version;
        this.css = json.css;
        this.creatorId = json.creatorId;
        this.editorId = json.editorId;

        this.days = arrayToCollection<Day>(json.days);
        this.periods = arrayToCollection<Period>(json.periods);
        this.subjects = arrayToCollection<Subject>(json.subjects);
        this.teachers = arrayToCollection<Teacher>(json.teachers);
        this.students = arrayToCollection<Student>(json.classes.map(student => ({
            ...student,
            groupSets: arrayToCollection<GroupSet>(student.groupSets.map(groupSet => ({
                ...groupSet,
                groups: arrayToCollection<Group>(groupSet.groups)
            })))
        })));
        this.activities = arrayToCollection<Activity>(json.activities.map(activity => ({
            ...activity,
            cards: arrayToCollection<Card>(activity.cards)
        })));
        this.cardStyles = arrayToCollection<CardStyle>(json.cardStyles);
    }

    expandSubject(subject: Subject | string): Subject {
        if (typeof subject === 'string') {
            subject = this.subjects.get(subject);
        }

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

        return {
            ...subject,
            students: arrayToCollection<Student>(students)
        }
    }

    expandStudent(student: Student | string): Student {
        if (typeof student === 'string') {
            student = this.students.get(student);
        }

        let subjects: Subject[] = [];
        for (let groupSet of student.groupSets.values()) {
            for (let group of groupSet.groups.values()) {
                for (let activity of this.activities.values()) {
                    if (activity.groupIds !== undefined && activity.groupIds.includes(group.id)) {
                        subjects.push(this.subjects.get(activity.subjectId));
                    }
                }
            }
        }

        return {
            ...student,
            subjects: arrayToCollection<Subject>(subjects)
        }
    }
}

export default PrimeTimeTable;