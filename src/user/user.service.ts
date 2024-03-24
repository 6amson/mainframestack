import { Injectable, HttpException, HttpStatus, } from "@nestjs/common";
import { httpErrorException } from './user.exception';
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, Product } from "./schema/user.schema";
import * as jwt from 'jsonwebtoken';
const bcrypt = require('bcrypt');
import { config } from 'dotenv';
import { UpdateProductDto, UserDto } from "./dto/user.dto";
import { ProductDto } from "./dto/user.dto";




config();

const accessTokenSecret: string = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret: string = process.env.REFRESH_TOKEN_SECRET;



@Injectable()
export class UserService {

    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Product.name) private productModel: Model<Product>
    ) { }


    //METHODS
    private generateAccessToken(payload: any): string {
        return jwt.sign({ payload }, accessTokenSecret, {
            expiresIn: '90d',
        });
    }

    private generateRefreshToken(payload: any): string {
        return jwt.sign({ payload }, refreshTokenSecret,
            { expiresIn: "5m" },
        );
    }

    private validateToken(token: string, secret: string): string | object {
        if (token == undefined || token == "") throw new httpErrorException(`${token}, Undefined token, Unauthorized access.`, HttpStatus.NOT_ACCEPTABLE)
        const tokens = token.slice(7, token.length).toString();
        const decoded = jwt.verify(tokens, secret);
        return decoded;
    }

    private verifyToken(verifyHeader: string): string {
        const token = verifyHeader;
        const final = this.validateToken(token, accessTokenSecret) as any;
        const userId = final.payload;
        return userId;

    }

    private async getProductsByUserId(verifyHeader: string): Promise<any> {
        const Id = this.verifyToken(verifyHeader);
        return await this.productModel.find({ user: Id }).exec();
    }


    //ROUTES

    async signup(user: User): Promise<{}> {
        const existingUser = await this.userModel.findOne({ email: user.email }).exec();

        if (existingUser) {
            throw new httpErrorException('User with this email already exists', HttpStatus.CONFLICT);
        }

        const hashedPassword = await bcrypt.hash(user.password, 10);

        const newUser = await this.userModel.create({
            ...user,
            password: hashedPassword,
        });

        newUser.save();
        const id = newUser._id;

        const accessToken = this.generateAccessToken(newUser._id);
        const refreshToken = this.generateRefreshToken(newUser._id);

        return { id, accessToken, refreshToken }
    }

    async signin(user: UserDto): Promise<{}> {
        const foundUser = await this.userModel.findOne({ email: user.email }).exec();
        const foundProduct = await this.productModel.find({ user: foundUser._id.toString() }).exec();

        if (!foundUser) {
            throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
        }

        const isPasswordValid = await bcrypt.compare(user.password, foundUser.password);

        if (!isPasswordValid) {

            throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
        }

        const accessToken = this.generateAccessToken(foundUser._id);
        const refreshToken = this.generateRefreshToken(foundUser._id);
        const id = foundUser._id.toString();


        return {
            accessToken,
            refreshToken,
            id,
            foundProduct
        }

    };


    public async verifyAuth(verifyHeader: string): Promise<object> {
        const token = verifyHeader;

        const final = this.validateToken(token, accessTokenSecret) as any;

        try {
            const refreshToken = this.generateRefreshToken(final.payload);
            const userId = final.payload;
            const userProfile = await this.userModel.findById(userId).exec();
            if (userProfile) {
                const products = await this.productModel.find({ user: userId });
                const { username } = userProfile;
                return { refreshToken, userId, username, products };
            }
        } catch (error) {
            console.log(error.message);
            throw new HttpException('Invalid Token', HttpStatus.BAD_REQUEST);
        }

    };

    async addProduct(productData: ProductDto, verifyHeader: string): Promise<Product> {
        try {
            const userId = this.verifyToken(verifyHeader);
            const product = new this.productModel({
                ...productData,
                user: userId,
            });
            return product.save();
        } catch (err) {
            throw err;
        }
    }


    async updateProduct(verifyHeader: string, productId: string, updateData: UpdateProductDto): Promise<Product> {
        const Id = this.verifyToken(verifyHeader);
        const product = await this.productModel.findOne({ _id: productId });

        if (product.user.toString() !== Id) {
            throw new HttpException('You do not have permission to access this product', HttpStatus.FORBIDDEN);
        }

        const updatedProduct = await this.productModel.findOneAndUpdate(
            { _id: productId },
            { $set: updateData },
            { new: true }
        );

        return updatedProduct;
    }

    async deleteProduct(verifyHeader: string, productId: string): Promise<any | null> {
        const Id = this.verifyToken(verifyHeader);
        const product = await this.productModel.findOne({ _id: productId });

        if (product.user.toString() !== Id) {
            throw new HttpException('You do not have permission to access this product', HttpStatus.FORBIDDEN);
        }

        const deletedProduct = await this.productModel.deleteOne({ _id: productId }).exec();

        return deletedProduct;
    }


    async getAllProducts(verifyHeader: string): Promise<Product> {
        const products = await this.getProductsByUserId(verifyHeader);
        return products;
    }
}

