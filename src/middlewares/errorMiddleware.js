import { Prisma } from "@prisma/client";

const handlePrismaError = (err) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return {
        statusCode: 409,
        message: "Duplicate field value",
      };
    }

    if (err.code === "P2025") {
      return {
        statusCode: 404,
        message: "Record not found",
      };
    }
  }

  return null;
};

export const errorMiddleware = (err, req, res, next) => {
  const prismaError = handlePrismaError(err);

  const statusCode = prismaError?.statusCode || err.statusCode || 500;
  const message = prismaError?.message || err.message || "Something went wrong";

  return res.status(statusCode).json({
    success: false,
    message,
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  });
};
