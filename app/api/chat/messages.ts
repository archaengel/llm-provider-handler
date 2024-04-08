import * as S from "@effect/schema/Schema";

export const Message = S.struct({
  role: S.union(S.literal("user"), S.literal("system")),
  content: S.string,
});

export interface Message extends S.Schema.Type<typeof Message> {}
