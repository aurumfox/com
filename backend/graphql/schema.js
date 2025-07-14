const schemaString = `
  # Custom scalar type for Date and Time values (e.g., ISO 8601 strings)
  # You'll need a custom scalar implementation in your GraphQL server setup.
  # Example: using graphql-scalars or a custom parser/serializer.
  scalar DateTime

  # Enum for User roles to ensure valid values
  enum UserRole {
    USER
    ADMIN
    PUBLISHER
    DEVELOPER
    # Add other roles as needed
  }

  # Enum for NFT Event types for clarity and type safety
  enum NFTEventType {
    MINTED
    LISTED
    BOUGHT
    TRANSFERRED
    DELISTED
    # Add other event types like BURNED, AUCTION_STARTED, etc.
  }

  type User {
    _id: ID!
    walletAddress: String!
    role: UserRole! # Use enum for roles
    createdAt: DateTime! # Use DateTime scalar
    updatedAt: DateTime! # Use DateTime scalar
    solanaBalance: Float # Optional, can be null if fetching fails
    splTokens: [SPLToken!] # List of non-nullable SPLToken objects
  }

  type SPLToken {
    mint: String!
    amount: Float!
    # Optional: name, symbol if available from token metadata
  }

  type NFT {
    _id: ID!
    name: String!
    description: String
    image: String # URL to the image
    mint: String! # Unique identifier for the token on the blockchain
    owner: String! # Wallet address of the current owner
    isListed: Boolean! # Whether the NFT is currently listed for sale
    price: Float # Price if listed for sale, nullable otherwise
    listedAt: DateTime # When it was listed, nullable if not listed
    listingDuration: Int # Duration of listing in days/hours, nullable if not listed
    listedBy: String # Wallet address of the lister, nullable if not listed
    attributes: [Attribute!] # List of non-nullable attributes
    history: [NFTEvent!] # List of non-nullable NFT events
    createdAt: DateTime! # Use DateTime scalar
    updatedAt: DateTime! # Use DateTime scalar
  }

  type Attribute {
    trait_type: String!
    value: String!
  }

  type NFTEvent {
    type: NFTEventType! # Use enum for event types
    from: String # Optional: previous owner/sender
    to: String # Optional: new owner/receiver
    price: Float # Optional: price involved in the event (e.g., sale price)
    timestamp: DateTime! # Use DateTime scalar
  }

  type Announcement {
    _id: ID!
    text: String!
    date: DateTime! # Use DateTime scalar
    author: ID # Optional: ID of the admin who created it
  }

  # --- Input Types for Mutations (Best Practice) ---

  input CreateUserInput {
    walletAddress: String!
    password: String!
    role: UserRole = USER # Default role can be provided here for clarity
  }

  input UpdateUserRoleInput {
    id: ID!
    role: UserRole!
  }

  input ListNFTInput {
    id: ID!
    sellerWallet: String! # This should ideally be verified against the authenticated user
    price: Float!
    duration: Int!
  }

  # Note: buyNFT typically only needs the NFT ID and the buyer is implicit from auth context.
  input BuyNFTInput {
    id: ID!
    # buyerWallet: String! # Removed: Buyer wallet should come from authentication context (req.user.walletAddress)
  }

  input CreateAnnouncementInput {
    text: String!
  }

  # --- Query Definitions ---
  type Query {
    hello: String

    # Users
    user(walletAddress: String!): User
    # Add pagination and filtering for users
    users(
      limit: Int = 10 # Default limit
      offset: Int = 0 # Default offset for skip-based pagination
      # Or for cursor-based: first: Int, after: String
      role: UserRole # Filter by role
    ): [User!]

    # NFTs
    nft(id: ID!): NFT
    # Add pagination, more filtering, and sorting for NFTs
    nfts(
      owner: String # Filter by owner wallet address
      isListed: Boolean # Filter by listed status
      # Add pagination
      limit: Int = 10
      offset: Int = 0
      # Add sorting: e.g., sortBy: String, sortOrder: String (ASC/DESC)
      minPrice: Float # Filter by minimum price
      maxPrice: Float # Filter by maximum price
    ): [NFT!]

    # Announcements
    # Add pagination and sorting for announcements
    announcements(
      limit: Int = 10
      offset: Int = 0
      # e.g., sortBy: String, sortOrder: String
    ): [Announcement!]
  }

  # --- Mutation Definitions ---
  type Mutation {
    createUser(input: CreateUserInput!): User # Use Input type
    updateUserRole(input: UpdateUserRoleInput!): User # Use Input type
    listNFT(input: ListNFTInput!): NFT # Use Input type
    buyNFT(input: BuyNFTInput!): NFT # Use Input type
    createAnnouncement(input: CreateAnnouncementInput!): Announcement # Use Input type
  }
`;

module.exports = { schemaString };
