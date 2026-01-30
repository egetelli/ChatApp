export interface Group {
    groupId: number;
    groupName: string;
    groupImage?: string;
    description?: string;
    isAdmin: boolean;
    memberCount: number;
}