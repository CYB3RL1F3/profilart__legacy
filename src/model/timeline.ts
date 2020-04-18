export interface Posts {
    title?: string;
    illustration?: string;
    content?: string;
    subtitle?: string;
    createdAt?: Date;
}

export interface UpdatePost {
    id: string;
    post: Posts;
}

export interface DeletePost {
    id: string;
}