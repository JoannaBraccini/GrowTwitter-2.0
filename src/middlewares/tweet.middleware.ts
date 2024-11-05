import { NextFunction, Request, Response } from "express";

export class TweetMiddleware {
  public static validateRequired(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { userId, type, parentId, content } = req.body;
    console.log(req.body);
    const errors: string[] = [];

    if (!type) {
      errors.push("Tweet type is required!");
    }
    if (!content) {
      errors.push("Content is required!");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        ok: false,
        message: errors,
      });
    }
    return next();
  }

  public static validateTypes(req: Request, res: Response, next: NextFunction) {
    const { userId, type, parentId, content } = req.body;
    const errors: string[] = [];

    if (typeof content !== "string") {
      errors.push("Content must be a string.");
    }
    if (parentId && typeof parentId !== "string") {
      errors.push("Parent-Tweet ID must be a string.");
    }
    if (type !== "TWEET" && type !== "REPLY") {
      errors.push("Type must be TWEET or REPLY");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        ok: false,
        message: errors,
      });
    }

    return next();
  }

  public static validateLenght(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { content } = req.body;

    if (content.length > 280) {
      return res.status(400).json({
        ok: false,
        message:
          "Content exceeds the maximum allowed length of 280 characters.",
      });
    }

    return next();
  }
}
