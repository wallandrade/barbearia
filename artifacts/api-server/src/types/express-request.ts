declare global {
  namespace Express {
    interface Request {
      adminSession?: {
        username?: string;
        isPrimary?: boolean | number;
        hasGlobalAccess?: boolean;
        sellerCode?: string | null;
      };
    }
  }
}

export {};
