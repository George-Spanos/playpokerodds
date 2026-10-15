-- Baseline: canonical schema generated from prisma migrate diff
-- (from-empty → schema.prisma). Matches deployed Prisma-managed databases.
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Rounds" (
    "id" TEXT NOT NULL,
    "myHand" JSONB NOT NULL,
    "opponentsHands" JSONB NOT NULL,
    "board" JSONB NOT NULL,
    "odds" DECIMAL(5,2) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rounds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoundAnswers" (
    "id" TEXT NOT NULL,
    "estimate" DECIMAL(5,2) NOT NULL,
    "userId" TEXT,
    "roundId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoundAnswers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserFavoriteRounds" (
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "UserFavoriteRounds_pkey" PRIMARY KEY ("roundId","userId")
);

CREATE TABLE "UserRoles" (
    "id" TEXT NOT NULL,
    "role" INTEGER NOT NULL,
    "userEmail" TEXT NOT NULL,
    CONSTRAINT "UserRoles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");
CREATE UNIQUE INDEX "Users_username_key" ON "Users"("username");
CREATE UNIQUE INDEX "UserRoles_userEmail_key" ON "UserRoles"("userEmail");

ALTER TABLE "RoundAnswers" ADD CONSTRAINT "RoundAnswers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoundAnswers" ADD CONSTRAINT "RoundAnswers_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserFavoriteRounds" ADD CONSTRAINT "UserFavoriteRounds_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserFavoriteRounds" ADD CONSTRAINT "UserFavoriteRounds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRoles" ADD CONSTRAINT "UserRoles_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "Users"("email") ON DELETE CASCADE ON UPDATE CASCADE;
