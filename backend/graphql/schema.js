// graphql/schema.js
const schemaString = `
  type User {
    _id: ID!
    walletAddress: String!
    role: String!
    createdAt: String!
    updatedAt: String!
    solanaBalance: Float
    splTokens: [SPLToken!]
  }

  type SPLToken {
    mint: String!
    amount: Float!
  }

  type NFT {
    _id: ID!
    name: String!
    description: String
    image: String
    mint: String!
    owner: String!
    isListed: Boolean!
    price: Float
    listedAt: String
    listingDuration: Int
    listedBy: String
    attributes: [Attribute!]
    history: [NFTEvent!]
    createdAt: String!
    updatedAt: String!
  }

  type Attribute {
    trait_type: String!
    value: String!
  }

  type NFTEvent {
    type: String!
    from: String
    to: String
    price: Float
    timestamp: String!
  }

  type Announcement {
    _id: ID!
    text: String!
    date: String!
  }

  type Query {
    hello: String
    user(walletAddress: String!): User
    users: [User!]
    nft(id: ID!): NFT
    nfts(owner: String, isListed: Boolean): [NFT!]
    announcements: [Announcement!]
  }

  type Mutation {
    createUser(walletAddress: String!, password: String!, role: String): User
    updateUserRole(id: ID!, role: String!): User
    listNFT(id: ID!, sellerWallet: String!, price: Float!, duration: Int!): NFT
    buyNFT(id: ID!, buyerWallet: String!): NFT
    createAnnouncement(text: String!): Announcement
  }
`;

module.exports = { schemaString };
