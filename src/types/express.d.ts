
export {};

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        email: string;
        name: string;
        role: "customer" | "admin";
        isBlocked: boolean;
      };
    }
  }
}
