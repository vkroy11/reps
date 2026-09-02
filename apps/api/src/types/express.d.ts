declare global {
  namespace Express {
    interface Request {
      /** Set by the identity middleware. Read it through requireUserId(). */
      userId?: string;
    }
  }
}

export {};
