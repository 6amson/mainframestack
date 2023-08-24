import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsEmail, IsNotEmpty } from 'class-validator';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
    @Prop({required:true})
    @IsNotEmpty()
    username: string;
    @Prop({required:true, unique:true, lowercase:true})
    @IsEmail()
    @IsNotEmpty()
    email: string;
    @Prop({required:true})
    @IsNotEmpty()
    password: string;
    @Prop({required: false})
    contractAddress: string;
    @Prop({required: false, type: Object})
    subscriptionId: object;
    @Prop({required: false})
    NFTsubscriptionId: string;
}
export const UserSchema = SchemaFactory.createForClass(User);