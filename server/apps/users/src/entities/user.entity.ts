import { Directive, Field, ObjectType } from '@nestjs/graphql';

// Định nghĩa kiểu đối tượng GraphQL cho Avatars
@ObjectType()
@Directive('@key(fields: "id")') // Directive cho Apollo Federation
export class Avatars {
  @Field()
  id: string;
  @Field()
  url: string;
  @Field()
  publicId: string;
  @Field()
  userId: string;
}

// Định nghĩa kiểu đối tượng GraphQL cho User
@ObjectType()
export class User {
  @Field()
  id: string;
  @Field()
  userName: string;
  @Field()
  email: string;
  @Field()
  password: string;
  @Field(() => Avatars, { nullable: true })
  avatar?: Avatars | null;
  @Field()
  role: string;
  @Field()
  phoneNumber: string;
  @Field({ nullable: true })
  address: string;
  @Field()
  createdAt: Date;
  @Field()
  updatedAt: Date;
}
