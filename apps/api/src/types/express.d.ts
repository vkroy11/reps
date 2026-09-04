declare global {
  namespace Express {
    interface Request {
      /** Set by the identity middleware. Read it through requireUserId(). */
      userId?: string;
      /**
       * The calling device, set for every authenticated request whether or not
       * a session token was supplied. Read it through requireDeviceId().
       */
      deviceId?: string;
    }
  }
}

export {};
