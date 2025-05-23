import { AuthMiddleware } from "../middlewares/auth/auth.middleware";
import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { UserMiddleware } from "../middlewares/user.middleware";
import { ValidateUuidMiddleware } from "../middlewares/validate-uuid.middleware";

export class UserRoutes {
  public static execute(): Router {
    const router = Router();

    //FIND ALL USERS (with optional query)
    router.get("/users", UserController.findMany);

    //FIND ONE USER (by id)
    router.get(
      "/users/:id",
      [AuthMiddleware.validate, ValidateUuidMiddleware.validate],
      UserController.findOne
    );

    //UPDATE USER (by id)
    router.put(
      "/users/:id",
      [
        AuthMiddleware.validate,
        ValidateUuidMiddleware.validate,
        UserMiddleware.validateTypes,
        UserMiddleware.validateLength,
      ],
      UserController.update
    );

    //DELETE USER (by id)
    router.delete(
      "/users/:id",
      [AuthMiddleware.validate, ValidateUuidMiddleware.validate],
      UserController.remove
    );

    //FOLLOW ACTIONS (by id)
    router.patch(
      "/users/follow/:id",
      [AuthMiddleware.validate, ValidateUuidMiddleware.validate],
      UserController.follow
    );

    return router;
  }
}
