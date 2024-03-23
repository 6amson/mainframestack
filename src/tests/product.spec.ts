import { AppModule } from '../app.module';
import { config } from 'dotenv';
import { TestingModule, Test } from '@nestjs/testing';
import { UserService } from '../user/user.service'
import { httpErrorException } from '../user/user.exception';
import { HttpStatus } from "@nestjs/common";


config();

let userId = 'id';
let productId = '11';

let userProducts = [{
    productId: '11',
    name: 'bag',
    price: 1,
    description: 'a bag',
    image: 'bag.com',
    amount: 1,
    user: 'id'
},
]

let newProducts = {
    name: 'a big bag',
    price: 3,
    description: 'a big black bag',
    image: 'bag.com',
    amount: 3,
}

let productData = {
    productId: '12',
    name: 'a blouse',
    price: 8,
    description: 'a red blouse',
    image: 'blouse.com',
    amount: 10,
    user: '9'
}

let Users = [{
    username: 'testuser',
    email: 'testuser@gmail.com',
    password: 'password',
    Id: 'id',
}];

const newUser = {
    username: 'testuser2',
    email: 'testuser2@gmail.com',
    password: 'password2',
}

const user = {
    email: 'testuser@gmail.com',
    password: 'password',
};

export class userRepositoryMock {
    findOne = jest.fn((user): boolean => {
        const foundUsers = Users.find(item => item.email == user.email);
        if (foundUsers) {
            return true;
        } else {
            false;
        }
    });

    create = jest.fn((user) => {
        const foundUsers = Users.find(item => item.email == user.email);
        if (foundUsers) {
            throw new httpErrorException('User with this email already exists', HttpStatus.CONFLICT);
        } else {
            return { Id: 'id', accessToken: 'token', refreshToken: 'token2' };
        }
    });

    filterProduct = jest.fn((Id: string, productId: string) => {
        const foundProducts = userProducts.find((item) => item.user == Id);
        const foundProducts2 = userProducts.find((item) => item.productId == productId);
        if (foundProducts == foundProducts2) {
            return foundProducts;
        }
        else {
            throw new httpErrorException('no product', HttpStatus.NOT_FOUND);
        }
    });

    getUserProduct = jest.fn((Id: string) => {
        const foundProducts = userProducts.find((item) => item.user == Id);
        const foundProducts2 = userProducts.find((item) => item.productId == productId);
        if (foundProducts == foundProducts2) {
            return foundProducts;
        }
        else {
            throw new httpErrorException('no product', HttpStatus.NOT_FOUND);
        }
    });

}


describe('UsersService', () => {
    let userServiceMock: UserService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: UserService,
                    useValue: {
                        signin: jest.fn((user): {} => {
                            if (user.email && user.password) {
                                const findOne = new userRepositoryMock;
                                const findone = findOne.findOne(user);
                                if (findone) {
                                    return { accessToken: 'token', refreshToken: 'token2', Id: 'id', products: {} };
                                } else {
                                    throw new httpErrorException('no user', HttpStatus.NOT_FOUND);
                                }
                            } else {
                                throw new httpErrorException('no username or password provided', HttpStatus.NO_CONTENT);
                            }
                        }),

                        signup: jest.fn(({ username, ...user }): any => {
                            const create = new userRepositoryMock;
                            return create.create(user);
                        }),

                        verifyAuth: jest.fn((token: string) => {
                            if (token) { return 'token1' }
                        }),

                        updateProduct: jest.fn((Id: string, productId: string,
                            data: {
                                name: string,
                                price?: number,
                                description?: string,
                                image?: string,
                                amount?: number,
                            }): {} => {
                            const filterproduct = new userRepositoryMock;
                            const filter = filterproduct.filterProduct(Id, productId);

                            filter.name = data.name;
                            filter.price = data.price;
                            filter.amount = data.amount;
                            filter.image = data.image;
                            filter.description = data.description;

                            return filter;
                        }),

                        getAllProducts: jest.fn((Id: string) => {
                            const products = userProducts.find((item) => item.user == Id);
                            return products;
                        }),

                        deleteProduct: jest.fn((Id: string, productId: string): null => {
                            const filterproduct = new userRepositoryMock;
                            const filter = filterproduct.filterProduct(Id, productId);

                            if (filter) {
                                return null;
                            } else {
                                throw new httpErrorException('no product', HttpStatus.NOT_FOUND);
                            }
                        }),

                        addProduct: jest.fn((datum: {
                            productId: string,
                            name: string;
                            price: number;
                            description: string;
                            image: string;
                            amount: number;
                            user: string
                        }, Id: string) => {
                            return datum;
                        })
                    }
                },
            ],
        }).compile();

        userServiceMock = module.get<UserService>(UserService);
    });


    describe('signin and signup', () => {
        it('should sign up a user and return an access & refresh tokens and userId', async () => {
            const response = await userServiceMock.signup({ ...newUser });
            console.log(response);
            expect(response).toEqual({ accessToken: 'token', refreshToken: 'token2', Id: 'id' })
        });

        it('should sign in a user and return an access & refresh tokens, userId, and products object', async () => {
            const response = await userServiceMock.signin(user);
            console.log(response);
            expect(response).toEqual({ accessToken: 'token', refreshToken: 'token2', Id: 'id', products: {} })
        });
    });

    describe('addproduct, updateproduct, deleteproduct, verifyAuth', () => {
        it('should update product and return the updated product schema', async () => {
            const response = await userServiceMock.updateProduct(userId, productId, newProducts);
            console.log(response);
            expect(response).toEqual({ productId: '11', name: 'a big bag', price: 3, description: 'a big black bag', image: 'bag.com', amount: 3, user: 'id' })
        });

        it('should return the usersProducts array', async () => {
            const response = await userServiceMock.getAllProducts(userId);
            console.log(response);
            expect([response]).toEqual(userProducts)
        });

        it('should return null if product is found and deleted', async () => {
            const response = await userServiceMock.deleteProduct(userId, productId);
            console.log(response);
            expect(response).toEqual(null);
        });

        it('should add data to the array and return the product data', async () => {
            const response = await userServiceMock.addProduct(productData, userId);
            console.log(response);
            expect(response).toEqual(productData);
        });
        
        it('should verify token and return string', async () => {
            const response = await userServiceMock.verifyAuth(userId);
            console.log(response);
            expect(response).toEqual('token1');
        });
    });
})