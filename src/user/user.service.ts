import { Injectable, HttpException, HttpStatus, } from "@nestjs/common";
import { httpErrorException } from './user.exception';
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, User2 } from "./schema/user.schema";
import * as jwt from 'jsonwebtoken';
const bcrypt = require('bcrypt');
import { config } from 'dotenv';
import { metamaskDto, UserDto } from "./dto/user.dto";
import { updateUserdto } from "./dto/user.dto";
const Web3 = require("web3").default;
const webpush = require('web-push');
import * as sigUtil from "@metamask/eth-sig-util";



config();

const accessTokenSecret: string = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret: string = process.env.REFRESH_TOKEN_SECRET;
const infura: string = process.env.INFURA_ID;
let subscription721;
let subscription1155;
const publicKey: string = process.env.VAPIDPUBLICKEYS;
const privateKey: string = process.env.VAPIDPRIVATEKEYS;
const gcmapi: string = process.env.GCMAPI


@Injectable()
export class UserService {

    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(User2.name) private user2Model: Model<User2>
    ) { }



    //METHODS
    private truncate = (string: string, limit: number) => {
        if (string.length <= limit) {
            return string;
        }
        return string.slice(0, limit) + "...";
    }


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
        const refreshToken = this.generateRefreshToken(final.payload);
        const userId = final.payload;
        return userId;

    }

    private async triggerPushNotifs(payload: string, subscription: any,): Promise<any> {

        webpush.setGCMAPIKey(gcmapi);
        webpush.setVapidDetails(
            'mailto:bunmigrey@icloud.com',
            publicKey,
            privateKey,
        );

        const options = {
            TTL: 10000,
            topic: "Gaze"
        };

        try {
            return await webpush.sendNotification(subscription, payload, options);
            //return (subscription);
        } catch (err) {
            throw err;
        }
    }


    private async subscribeNFTNotifs(id: string, Address: string): Promise<any> {
        const web3 = new Web3(`wss://mainnet.infura.io/ws/v3/999d41692ca8409990e9fe8d035916e7`);

        const filter = { _id: id };

        let options721 = {
            topics: [web3.utils.sha3("Transfer(address,address,uint256)")],
        };

        let options1155 = {
            topics: [
                web3.utils.sha3("TransferSingle(address,address,address,uint256,uint256)"),
            ],
        };

        const ERC165Abi: any = [
            {
                inputs: [
                    {
                        internalType: "bytes4",
                        name: "interfaceId",
                        type: "bytes4",
                    },
                ],
                name: "supportsInterface",
                outputs: [
                    {
                        internalType: "bool",
                        name: "",
                        type: "bool",
                    },
                ],
                stateMutability: "view",
                type: "function",
            },
        ];

        const ERC1155InterfaceId: string = "0xd9b67a26";
        const ERC721InterfaceId: string = "0x80ac58cd";

        const newContract = new web3.eth.Contract(
            ERC165Abi,
            Address
        );


        //verify if the contract adddress is erc721 or erc1155, returns a boolean;
        const erc1155 = await newContract.methods.supportsInterface(ERC1155InterfaceId).call()

        const erc721 = await newContract.methods.supportsInterface(ERC721InterfaceId).call();

        if (erc721) {

            try {
                subscription721 = await web3.eth.subscribe("logs", options721);

                const update = {
                    $set: {
                        NFTsubscriptionId: subscription721.id,
                    }
                };

                subscription721.on("error", () => {
                    throw new httpErrorException('There is an error with your subscription, please retry', HttpStatus.BAD_GATEWAY);
                });

                subscription721.on("data", (event) => {
                    if (event.topics.length == 4) {
                        let transaction = web3.eth.abi.decodeLog(
                            [
                                {
                                    type: "address",
                                    name: "from",
                                    indexed: true,
                                },
                                {
                                    type: "address",
                                    name: "to",
                                    indexed: true,
                                },
                                {
                                    type: "uint256",
                                    name: "tokenId",
                                    indexed: true,
                                },
                            ],
                            event.data,
                            [event.topics[1], event.topics[2], event.topics[3]]
                        );

                        (async () => {
                            const userProfile = await this.userModel.findById(id).exec();

                            if (userProfile) {
                                if (userProfile.contractAddress == null || userProfile.contractAddress == '') {
                                    return;
                                } else if (userProfile.contractAddress != null || userProfile.contractAddress != '') {
                                    const { subscriptionId } = userProfile;
                                    const payload = JSON.stringify({
                                        title: transaction.from === "0x0000000000000000000000000000000000000000"
                                            ? "GAZE New Mint 🚀"
                                            : "GAZE New Transfer 💸",
                                        body: transaction.from === "0x0000000000000000000000000000000000000000"
                                            ? `\n` +
                                            `NFT with Token ID ${this.truncate(transaction.tokenId.toString(), 5)}.\n` +
                                            `minted in block ${this.truncate(event.blockNumber.toString(), 7)}.\n`
                                            : `\n` +
                                            `NFT with Token ID ${transaction.tokenId}.\n` +
                                            `transferred in block ${event.blockNumber}.\n`,
                                        icon: 'https://res.cloudinary.com/dis6jfj29/image/upload/v1691076029/gaze_logo_no_background_dgy9tr.png',
                                    });


                                    await this.triggerPushNotifs(payload, subscriptionId);


                                    await this.userModel.findOneAndUpdate(
                                        { _id: id },
                                        {
                                            $push: {
                                                NFTNotification: {
                                                    $each: [
                                                        {
                                                            status: transaction.from === "0x0000000000000000000000000000000000000000"
                                                                ? "New Mint"
                                                                : "New Transfer"
                                                            ,
                                                            addrFrom: transaction.from === "0x0000000000000000000000000000000000000000"
                                                                ? "0x000"
                                                                : transaction.from
                                                            ,
                                                            addrTo: transaction.to,
                                                            transactionHash: this.truncate(event.transactionHash, 25),
                                                            blockNumber: event.blockNumber,
                                                            tokenId: transaction.tokenId,
                                                        }
                                                    ],
                                                    $slice: -21
                                                },
                                            },
                                        },
                                    )

                                    console.log(
                                        `\n` +
                                        `New ERC-712 transaction found in block ${event.blockNumber} with hash ${event.transactionHash}\n` +
                                        `From: ${transaction.from === "0x0000000000000000000000000000000000000000"
                                            ? "New mint!"
                                            : transaction.from
                                        }\n` +
                                        `To: ${transaction.to}\n` +
                                        `Token contract: ${event.address}\n` +
                                        `Token ID: ${transaction.tokenId}\n` +
                                        `Token aadr: ${event.address}\n`
                                    );
                                }
                            }

                            const user2Profile = await this.user2Model.findById(id).exec();

                            if (user2Profile) {
                                if (user2Profile.contractAddress == null || user2Profile.contractAddress == '') {
                                    return;
                                } else if (user2Profile.contractAddress != null || user2Profile.contractAddress != '') {
                                    const { subscriptionId } = user2Profile;
                                    const payload = JSON.stringify({
                                        title: transaction.from === "0x0000000000000000000000000000000000000000"
                                            ? "GAZE New Mint 🚀"
                                            : "GAZE New Transfer 💸",
                                        body: transaction.from === "0x0000000000000000000000000000000000000000"
                                            ? `\n` +
                                            `NFT with Token ID ${this.truncate(transaction.tokenId.toString(), 5)}.\n` +
                                            `minted in block ${this.truncate(event.blockNumber.toString(), 7)}.\n`
                                            : `\n` +
                                            `NFT with Token ID ${transaction.tokenId}.\n` +
                                            `transferred in block ${event.blockNumber}.\n`,
                                        icon: 'https://res.cloudinary.com/dis6jfj29/image/upload/v1691076029/gaze_logo_no_background_dgy9tr.png',
                                    });


                                    await this.triggerPushNotifs(payload, subscriptionId);


                                    await this.user2Model.findOneAndUpdate(
                                        { _id: id },
                                        {
                                            $push: {
                                                NFTNotification: {
                                                    $each: [
                                                        {
                                                            status: transaction.from === "0x0000000000000000000000000000000000000000"
                                                                ? "New Mint"
                                                                : "New Transfer"
                                                            ,
                                                            addrFrom: transaction.from === "0x0000000000000000000000000000000000000000"
                                                                ? "0x000"
                                                                : transaction.from
                                                            ,
                                                            addrTo: transaction.to,
                                                            transactionHash: this.truncate(event.transactionHash, 25),
                                                            blockNumber: event.blockNumber,
                                                            tokenId: transaction.tokenId,
                                                        }
                                                    ],
                                                    $slice: -21
                                                },
                                            },
                                        },
                                    )

                                    console.log(
                                        `\n` +
                                        `New ERC-712 transaction found in block ${event.blockNumber} with hash ${event.transactionHash}\n` +
                                        `From: ${transaction.from === "0x0000000000000000000000000000000000000000"
                                            ? "New mint!"
                                            : transaction.from
                                        }\n` +
                                        `To: ${transaction.to}\n` +
                                        `Token contract: ${event.address}\n` +
                                        `Token ID: ${transaction.tokenId}\n` +
                                        `Token aadr: ${Address}\n`
                                    );
                                }
                            }

                        })()



                    }
                });

                console.log("Subscription on ERC-721 started with ID %s", subscription721.id);
                const T721 = await this.userModel.findOneAndUpdate(filter, update, { new: true });
                if (T721) {
                    return { contractAddress: T721.contractAddress };
                }

                const TT721 = await this.user2Model.findOneAndUpdate(filter, update, { new: true });
                if (TT721) {
                    return { contractAddress: TT721.contractAddress };
                }
                // return subscription721.removeSubsription();


            } catch (error) {
                return error;
            }

        } else if (erc1155) {

            try {
                subscription1155 = await web3.eth.subscribe("logs", options1155);
                const update = {
                    $set: {
                        NFTsubscriptionId: subscription1155.id,
                    }
                };

                subscription1155.on("error", (err) => {
                    console.info(err)
                    throw new httpErrorException('There is an error with your subscription, please retry', HttpStatus.BAD_GATEWAY);
                });

                subscription1155.on("data", (event) => {
                    let transaction = web3.eth.abi.decodeLog(
                        [
                            {
                                type: "address",
                                name: "operator",
                                indexed: true,
                            },
                            {
                                type: "address",
                                name: "from",
                                indexed: true,
                            },
                            {
                                type: "address",
                                name: "to",
                                indexed: true,
                            },
                            {
                                type: "uint256",
                                name: "id",
                            },
                            {
                                type: "uint256",
                                name: "value",
                            },
                        ],
                        event.data,
                        [event.topics[1], event.topics[2], event.topics[3]]
                    );

                    (async () => {
                        const userProfile = await this.userModel.findById(id).exec();

                        if (userProfile) {
                            if (userProfile.contractAddress == null || userProfile.contractAddress == '') {
                                return;

                            } else if (userProfile.contractAddress != null || userProfile.contractAddress != '') {
                                const { subscriptionId } = userProfile;
                                const payload = JSON.stringify({
                                    title: transaction.from === "0x0000000000000000000000000000000000000000"
                                        ? "GAZE New Mint 🚀"
                                        : "GAZE New Transfer 💸",
                                    body: transaction.from === "0x0000000000000000000000000000000000000000"
                                        ? `\n` +
                                        `NFT with Token ID ${this.truncate(transaction.tokenId.toString(), 5)}.\n` +
                                        `minted in block ${this.truncate(event.blockNumber.toString(), 7)}.\n`
                                        : `\n` +
                                        `NFT with Token ID ${transaction.tokenId}.\n` +
                                        `transferred in block ${event.blockNumber}.\n`,
                                    icon: 'https://res.cloudinary.com/dis6jfj29/image/upload/v1691076029/gaze_logo_no_background_dgy9tr.png',
                                });

                                await this.triggerPushNotifs(payload, subscriptionId);

                                await this.userModel.findOneAndUpdate(
                                    { _id: id },
                                    {
                                        $push: {
                                            NFTNotification: {
                                                $each: [
                                                    {
                                                        status: transaction.from === "0x0000000000000000000000000000000000000000"
                                                            ? "New Mint"
                                                            : "New Transfer"
                                                        ,
                                                        addrFrom: transaction.from === "0x0000000000000000000000000000000000000000"
                                                            ? "0x000"
                                                            : transaction.from
                                                        ,
                                                        addrTo: transaction.to,
                                                        transactionHash: this.truncate(event.transactionHash, 25),
                                                        blockNumber: event.blockNumber,
                                                        tokenId: transaction.tokenId,
                                                    }
                                                ],
                                                $slice: -21
                                            },
                                        },
                                    },
                                )

                                console.log(
                                    `\n` +
                                    `New ERC-712 transaction found in block ${event.blockNumber} with hash ${event.transactionHash}\n` +
                                    `From: ${transaction.from === "0x0000000000000000000000000000000000000000"
                                        ? "New mint!"
                                        : transaction.from
                                    }\n` +
                                    `To: ${transaction.to}\n` +
                                    `Token contract: ${event.address}\n` +
                                    `Token ID: ${transaction.tokenId}\n` +
                                    `userProfile: ${userProfile.contractAddress}`
                                );
                            }
                        }

                        const user2Profile = await this.user2Model.findById(id).exec();

                        if (user2Profile) {
                            if (user2Profile.contractAddress == null || user2Profile.contractAddress == '') {
                                return;

                            } else if (user2Profile.contractAddress != null || user2Profile.contractAddress != '') {
                                const { subscriptionId } = user2Profile;
                                const payload = JSON.stringify({
                                    title: transaction.from === "0x0000000000000000000000000000000000000000"
                                        ? "GAZE New Mint 🚀"
                                        : "GAZE New Transfer 💸",
                                    body: transaction.from === "0x0000000000000000000000000000000000000000"
                                        ? `\n` +
                                        `NFT with Token ID ${this.truncate(transaction.tokenId.toString(), 5)}.\n` +
                                        `minted in block ${this.truncate(event.blockNumber.toString(), 7)}.\n`
                                        : `\n` +
                                        `NFT with Token ID ${transaction.tokenId}.\n` +
                                        `transferred in block ${event.blockNumber}.\n`,
                                    icon: 'https://res.cloudinary.com/dis6jfj29/image/upload/v1691076029/gaze_logo_no_background_dgy9tr.png',
                                });

                                await this.triggerPushNotifs(payload, subscriptionId);

                                await this.user2Model.findOneAndUpdate(
                                    { _id: id },
                                    {
                                        $push: {
                                            NFTNotification: {
                                                $each: [
                                                    {
                                                        status: transaction.from === "0x0000000000000000000000000000000000000000"
                                                            ? "New Mint"
                                                            : "New Transfer"
                                                        ,
                                                        addrFrom: transaction.from === "0x0000000000000000000000000000000000000000"
                                                            ? "0x000"
                                                            : transaction.from
                                                        ,
                                                        addrTo: transaction.to,
                                                        transactionHash: this.truncate(event.transactionHash, 25),
                                                        blockNumber: event.blockNumber,
                                                        tokenId: transaction.tokenId,
                                                    }
                                                ],
                                                $slice: -21
                                            },
                                        },
                                    },
                                )

                                console.log(
                                    `\n` +
                                    `New ERC-712 transaction found in block ${event.blockNumber} with hash ${event.transactionHash}\n` +
                                    `From: ${transaction.from === "0x0000000000000000000000000000000000000000"
                                        ? "New mint!"
                                        : transaction.from
                                    }\n` +
                                    `To: ${transaction.to}\n` +
                                    `Token contract: ${event.address}\n` +
                                    `Token ID: ${transaction.tokenId}\n` +
                                    `userProfile: ${userProfile.contractAddress}`
                                );
                            }
                        }

                    })();



                });

                console.log("Subscription on ERC-1155 started with ID %s", subscription1155.id)

                const T1155 = await this.userModel.findOneAndUpdate(filter, update, { new: true });
                if (T1155) {
                    return { contractAddress: T1155.contractAddress };
                }

                const TT1155 = await this.user2Model.findOneAndUpdate(filter, update, { new: true });
                if (TT1155) {
                    return { contractAddress: TT1155.contractAddress };
                }


            } catch (error) {
                return error;
            }
        }

    }



    private async getNFTNotifs(tokenid: string): Promise<any> {
        const userProfile = await this.userModel.findById(tokenid).exec();
        if (userProfile) {
            return userProfile.NFTNotification;
            // throw new httpErrorException('Notification empty', HttpStatus.NOT_FOUND)
        };

        const user2Profile = await this.user2Model.findById(tokenid).exec();
        if (user2Profile) {
            return user2Profile.NFTNotification;
        }

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


    async signupMetamask(user: User2): Promise<{}> {
        const existingUser = await this.user2Model.findOne({ accountAddr: user.accountAddr }).exec();

        const { sign, msg } = user.signature;
        const options = {
            data: msg,
            signature: sign,
        };

        const recovered = sigUtil.recoverPersonalSignature(options);

        if (existingUser && existingUser.accountAddr == recovered) {
            await this.user2Model.collection.dropIndexes();

            const filter = { _id: existingUser._id };

            const update = {
                $set: {
                    signature: user.signature,
                }
            };

            await this.user2Model.findOneAndUpdate(filter, update, { new: true }) as any;

            const accessToken = this.generateAccessToken(existingUser._id);
            const refreshToken = this.generateRefreshToken(existingUser._id);
            const id = existingUser._id.toString();

            return {
                accessToken,
                refreshToken,
                id,
            }

            // return (existingUser);
        } else if (!existingUser && recovered == user.accountAddr) {
            const newUser = await this.user2Model.create({ ...user, signature: user.signature });
            newUser.save();

            const accessToken = this.generateAccessToken(newUser._id);
            const refreshToken = this.generateRefreshToken(newUser._id);
            const id = newUser._id.toString();

            return {
                accessToken,
                refreshToken,
                id,
            }

        }

        throw new httpErrorException(`Metamask address doesn't match`, HttpStatus.CONFLICT);

    }


    async signin(user: UserDto): Promise<{ accessToken: string, refreshToken: string, id: string }> {
        const foundUser = await this.userModel.findOne({ email: user.email }).exec();


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
        }

    };

    public async verifyAuth(verifyHeader: string): Promise<object> {
        const token = verifyHeader;

        const final = this.validateToken(token, accessTokenSecret) as any;

        try {
            // return this.generateRefreshToken(final.payload);
            const refreshToken = this.generateRefreshToken(final.payload);
            const userId = final.payload;
            const userProfile = await this.userModel.findById(userId).exec();
            if (userProfile) {
                const { contractAddress, username } = userProfile;

                if (!contractAddress) {
                    return { refreshToken, userId, contractAddress: null, username };
                } else if (contractAddress) {
                    return { refreshToken, userId, contractAddress, username };
                }
            }

            const user2Profile = await this.user2Model.findById(userId).exec();

            if (user2Profile) {
                const { contractAddress } = user2Profile;

                if (!contractAddress) {
                    return { refreshToken, userId, contractAddress: null };
                } else if (contractAddress) {
                    return { refreshToken, userId, contractAddress };
                }
            }


        } catch (error) {
            console.log(error.message);
        }

    };


    async updateAndSubscribe(user: updateUserdto, verifyHeader: string): Promise<any> {
        const userId = this.verifyToken(verifyHeader) as any;
        const { endpoint } = user.subscriptionId as any;

        const filter = { _id: userId };

        if (Web3.utils.isAddress(user.contractAddress)) {
            const update = {
                $set: {
                    contractAddress: user.contractAddress,
                    subscriptionId: user.subscriptionId,
                }
            };

            try {
                const userProfile = await this.userModel.findOneAndUpdate(filter, update, { new: true }) as any

                if (userProfile) {

                    if (endpoint == null || endpoint == "") {
                        throw new httpErrorException(`Something went wrong. Enable notification permission on your browser and retry`, HttpStatus.BAD_REQUEST);
                    } else if (endpoint != null || endpoint != "") {
                        await this.subscribeNFTNotifs(userId, user.contractAddress);

                        return userProfile.contractAddress;
                    }
                }

                const user2Profile = await this.user2Model.findOneAndUpdate(filter, update, { new: true }) as any;

                if (user2Profile) {
                    if (endpoint == null || endpoint == "") {
                        throw new httpErrorException(`Something went wrong. Enable notification permission on your browser and retry`, HttpStatus.BAD_REQUEST);
                    } else if (endpoint != null || endpoint != "") {
                        const subs = await this.subscribeNFTNotifs(userId, user.contractAddress);

                        return user2Profile.contractAddress;
                    }
                }

            } catch (error) {
                // return { userSubscribed: false};
                return error;
            }
        }

        throw new httpErrorException('Wrong contract address or format, Please check again.', HttpStatus.UNPROCESSABLE_ENTITY);
    };




    async UnsubscribeNFTNotifs(verifyHeader: string): Promise<any> {
        const userId = this.verifyToken(verifyHeader) as any;
        const filter = { _id: userId };

        const update = {
            $set: {
                contractAddress: null,
                subscriptionId: null,
                NFTsubscriptionId: null,
                NFTNotification: [],
            }
        };

        try {
            const subs = await this.userModel.findOneAndUpdate(filter, update, { new: true }) as any;
            if (subs) {
                return { contractAddress: subs.contractAddress };
            }

            const sub = await this.user2Model.findOneAndUpdate(filter, update, { new: true }) as any;
            if (sub) {
                return { contractAddress: sub.contractAddress };
            }
        } catch (error) {
            return error;
            // return {userSubscribed: false};
        }
    };



    async getNFTNotification(verifyHeader: string): Promise<any> {
        const { userId } = await this.verifyAuth(verifyHeader) as any;

        return await this.getNFTNotifs(userId);
    }





    //Test routesb
    async tests(verifyHeader: string): Promise<any> {
        // const { userId } = this.verifyToken(id) as any;
        return await this.UnsubscribeNFTNotifs(verifyHeader);

    }

    async proto(verifyHeader: string): Promise<any> {
        const { contractAddress, userId } = await this.verifyAuth(verifyHeader) as any;

        // return await this.subscribeNFTNotifs(userId, contractAddress);
        const msg = 'dinosaur';

        // const msgBuffer = ethereumJsUtil.toBuffer(msg);
        // const msgHash = ethereumJsUtil.hashPersonalMessage(msgBuffer);
        // const signatureBuffer = ethereumJsUtil.toBuffer(signature);
        // const signatureParams = ethereumJsUtil.fromRpcSig(signatureBuffer);
        // const publicKey = ethereumJsUtil.ecrecover(
        //     msgHash,
        //     signatureParams.v,
        //     signatureParams.r,
        //     signatureParams.s
        // );
        // const addressBuffer = ethereumJsUtil.publicToAddress(publicKey);
        // const address = ethereumJsUtil.bufferToHex(addressBuffer);

        // return(address);
    }
}

