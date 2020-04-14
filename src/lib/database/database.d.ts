export interface Selectable {
  _id: string;
}

export interface Insertable<Content> {
  content: Content;
}

export interface Data<Content> extends Selectable, Insertable<Content> {}
