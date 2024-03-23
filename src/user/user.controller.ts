import { Body, Controller, Delete, Get, HttpStatus, Redirect, Param, Post, Headers, Put,Req, Res } from "@nestjs/common";
import { User, Product } from "./schema/user.schema";
import { UserService } from "./user.service";
import { UserDto, UpdateProductDto, ProductDto } from "./dto/user.dto";

@Controller()
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get()
    // @Redirect('https://documenter.getpostman.com/view/26141564/2s9Y5VVQWB', 301)
    // @Redirect('https://gaze.ink', 301)
    redirectToWebsite() {}


    @Post('user/signup')
    async Signup(@Res() response, @Body() user: User) {
        const newUSer = await this.userService.signup(user);
        return response.status(HttpStatus.CREATED).json({
            ...newUSer
        })
    }

    @Post('user/signin')
    async SignIn(@Res() response, @Body() user: UserDto) {
        const token = await this.userService.signin(user);
        return response.status(HttpStatus.OK).json(token)
    }

    @Get('user/verify')
    async verifyAuth (@Headers('authorization') authHeader: string,){
        
        return this.userService.verifyAuth(authHeader)
    }

    @Post('user/addproduct')
    async addProduct (@Headers('authorization') authHeader: string, @Body() productData: ProductDto){
        return this.userService.addProduct(productData, authHeader);
    }

    @Put('user/updateproduct')
    async updateProduct (@Headers('authorization') authHeader: string, @Body() productData: UpdateProductDto, @Headers('productId') productId: string){
        return this.userService.updateProduct(authHeader, productId, productData);
    }

    @Delete('user/deleteproduct')
    async deleteProduct (@Headers('authorization') authHeader: string, @Headers('productId') productId: string){
        return this.userService.deleteProduct(authHeader, productId);
    }

    @Get('user/getproduct')
    async getProduct (@Headers('authorization') authHeader: string){
        return this.userService.getProducts(authHeader);
    }


    @Get('user/proto')
    async proto (){
        return this.userService.proto();
    }

}