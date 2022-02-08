/** This is the `RA` interface */
export interface RA_Input {
  props: Prop;
}

/** This is the `Prop` interface */
export interface Prop {
  pageProps: PageProp;
  locale: string;
  messages: Map<string, string>;
  asPath: string;
  cookies: Cookie;
  contentLanguage: string;
  serverTime: number;
  featureSwitche: FeatureSwitche;
  apolloState: Map<string, ApolloState>;
}

/** This is the `PageProp` interface */
export interface PageProp {
  pageProp: string;
}

/** This is the `Cookie` interface */
export interface Cookie {
  ravelinDeviceId: string;
  ravelinSessionId: string;
}

/** This is the `FeatureSwitche` interface */
export interface FeatureSwitche {
  createEventForm: boolean;
  promoterPaymentDetailsPage: boolean;
  testFeature: boolean;
}

/** This is the `ApolloState` interface */
export interface ApolloState {
  id: string;
  name: string;
  urlName: string;
  country?: Country;
  typename?: string;
  urlCode?: string;
  followerCount?: number;
  firstName?: string;
  lastName?: string;
  aliases?: string;
  bookingDetails?: string;
  isFollowing?: boolean;
  coverImage?: string;
  contentUrl?: string;
  facebook?: string;
  soundcloud?: string;
  instagram?: string;
  twitter?: string;
  bandcamp?: string;
  discogs?: string;
  website?: string;
  urlSafeName?: string;
  residentCountry: Db;
  image: string;
}

/** This is the `Country` interface */
export interface Country {
  type: string;
  generated: boolean;
  id: string;
  typename: string;
}

/** This is the `AreasLimit1` interface */

/** This is the `Artist` interface */
export interface Db {
  type: string;
  generated: boolean;
  id: string;
  typename: string;
}
