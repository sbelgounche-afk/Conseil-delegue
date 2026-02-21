export interface User {
    id?: number;
    username: string;
    email: string;
    password?: string;
    name?: string;
    phone?: string;
    age?: number;
    grade?: string;
    school?: string;
    bio?: string;
    avatar?: string;
    is_admin?: number;
    created_at?: string;
}
export interface Post {
    id?: number;
    user_id: number;
    image: string;
    caption?: string;
    likes?: number;
    created_at?: string;
    username?: string;
    avatar?: string;
    liked?: boolean;
    comment_count?: number;
    comments?: Comment[];
}
export interface Comment {
    id?: number;
    user_id: number;
    post_id: number;
    text: string;
    username?: string;
    created_at?: string;
}
export interface Like {
    id?: number;
    user_id: number;
    post_id: number;
    created_at?: string;
}
export interface Follow {
    id?: number;
    follower_id: number;
    following_id: number;
    created_at?: string;
}
//# sourceMappingURL=models.d.ts.map