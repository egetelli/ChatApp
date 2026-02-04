export interface GroupMember {
  userId: string;
  userName: string;
  fullName: string;
  profileImage: string | null;
  isAdmin: boolean;
}