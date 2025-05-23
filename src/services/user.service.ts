import { ActionUserDto, UserBaseDto, UserDto, UserUpdateDto } from "../dtos";
import { Prisma, TweetType, User } from "@prisma/client";

import { Bcrypt } from "../utils/bcrypt";
import { ResponseApi } from "../types/response";
import { prisma } from "../database/prisma.database";

export class UserService {
  //READ (optional search query)
  public async findMany(search?: string): Promise<ResponseApi> {
    try {
      const where: Prisma.UserWhereInput = search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {};

      const users = await prisma.user.findMany({ where });

      if (users.length === 0) {
        return {
          ok: false,
          code: 404,
          message: "No users found",
        };
      }
      const userDtos = await Promise.all(users.map((user) => user));

      return {
        ok: true,
        code: 200,
        message: "Users retrieved successfully",
        data: userDtos, //retorna dados básicos
      };
    } catch (error: any) {
      return {
        ok: false,
        code: 500,
        message: `Internal server error: ${error.message}`,
      };
    }
  }

  //READ (id one)
  public async findOne(id: string): Promise<ResponseApi> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: this.includeUserRelations(),
      });

      if (!user) {
        return {
          ok: false,
          code: 404,
          message: "User not found",
        };
      }

      // Filtrar propriedades indesejadas
      const filteredUser = (({ email, password, ...rest }) => rest)(user);

      return {
        ok: true,
        code: 200,
        message: "User details retrieved successfully",
        data: filteredUser,
      };
    } catch (error: any) {
      return {
        ok: false,
        code: 500,
        message: `Internal server error: ${error.message}`,
      };
    }
  }

  //UPDATE (id)
  public async update(updateUser: UserUpdateDto): Promise<ResponseApi> {
    const {
      id,
      userId,
      name,
      username,
      oldPassword,
      newPassword,
      bio,
      avatarUrl,
    } = updateUser;

    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return {
          code: 404,
          ok: false,
          message: "User not found",
        };
      }

      // Verificar se o usuário autenticado é o mesmo que está sendo atualizado
      if (id !== userId) {
        return {
          ok: false,
          code: 401,
          message: "You are not authorized to modify this profile",
        };
      }

      //verificar se já existe usuário com username cadastrado
      if (username) {
        const existingUser = await prisma.user.findFirst({
          where: { username: username, NOT: { id } }, //ignora o próprio id na busca
        });
        if (existingUser) {
          return {
            ok: false,
            code: 409, //conflict
            message: "Username is already in use",
          };
        }
      }

      //gerar novo hash para a senha atualizada
      let hashedPassword: string | undefined;
      if (oldPassword && newPassword) {
        const bcrypt = new Bcrypt();
        const passwordValid = await bcrypt.verify(oldPassword, user.password);

        if (!passwordValid) {
          return {
            ok: false,
            code: 400,
            message: "Wrong password",
          };
        }

        const passwordCompare = await bcrypt.verify(newPassword, user.password);

        if (passwordCompare) {
          return {
            ok: false,
            code: 400,
            message: "New password must be different from the previous one",
          };
        }

        hashedPassword = await bcrypt.generateHash(newPassword);
      }

      const dataToUpdate: Partial<User> = {};
      if (name) dataToUpdate.name = name;
      if (username) dataToUpdate.username = username;
      if (bio) dataToUpdate.bio = bio;
      if (avatarUrl) dataToUpdate.avatarUrl = avatarUrl;
      if (hashedPassword) dataToUpdate.password = hashedPassword;

      //salva os dados novos
      const userUpdated = await prisma.user.update({
        where: { id },
        data: { ...dataToUpdate },
      });

      return {
        ok: true,
        code: 200,
        message: "User profile updated successfully",
        data: {
          id: userUpdated.id,
          name: userUpdated.name,
          username: userUpdated.username,
          email: userUpdated.email,
          bio: userUpdated.bio,
          avatarUrl: userUpdated.avatarUrl,
        },
      };
    } catch (error: any) {
      return {
        ok: false,
        code: 500,
        message: `Internal server error: ${error.message}`,
      };
    }
  }

  //DELETE (id)
  public async remove({ id, userId }: ActionUserDto): Promise<ResponseApi> {
    try {
      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        return {
          ok: false,
          code: 404,
          message: "User not found",
        };
      }

      // Verificar se o usuário autenticado é o mesmo que está sendo atualizado
      if (id !== userId) {
        return {
          ok: false,
          code: 401,
          message: "You are not authorized to delete this profile",
        };
      }

      const userDeleted = await prisma.user.delete({
        where: { id },
      });

      return {
        ok: true,
        code: 200,
        message: "User removed successfully",
        data: userDeleted,
      };
    } catch (error: any) {
      return {
        ok: false,
        code: 500,
        message: `Internal server error: ${error.message}`,
      };
    }
  }

  //FOLLOW/UNFOLLOW (id)
  public async follow({
    userId: followerId,
    id: followedId,
  }: ActionUserDto): Promise<ResponseApi> {
    try {
      // Verificar se os usuários existem
      const follower = await prisma.user.findUnique({
        where: { id: followerId },
      });

      const followed = await prisma.user.findUnique({
        where: { id: followedId },
      });

      if (!follower || !followed) {
        return {
          ok: false,
          code: 404, // Not Found
          message: "User not found",
        };
      }

      // Verificar se usuário tenta seguir a si mesmo
      if (followerId === followedId) {
        return {
          ok: false,
          code: 409, // Conflict
          message: "You cannot follow yourself",
        };
      }

      // Verificar se usuário já segue
      const alreadyFollows = await prisma.follower.findUnique({
        where: {
          followerId_followedId: {
            followerId,
            followedId,
          },
        },
      });

      let follow = alreadyFollows;
      if (alreadyFollows) {
        await prisma.follower.delete({
          where: { id: alreadyFollows.id },
        }); // Unfollow
      } else {
        follow = await prisma.follower.create({
          data: { followerId, followedId },
        }); // Follow
      }

      return {
        ok: true,
        code: alreadyFollows ? 200 : 201,
        message: alreadyFollows
          ? "Successfully unfollowed the user"
          : "Successfully followed the user",
        data: follow,
      };
    } catch (error: any) {
      return {
        ok: false,
        code: 500,
        message: `Internal server error: ${error.message}`,
      };
    }
  }

  //Métodos Privados
  //FIND RELATED
  private includeUserRelations() {
    return {
      //lista de seguidores deste usuário
      followers: {
        include: {
          follower: true, //dados do seguidor
        },
      },
      //lista de seguidos por este usuário
      following: {
        include: {
          followed: true, //dados do usuário seguido
        },
      },
    };
  }
}
