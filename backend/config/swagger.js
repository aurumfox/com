# config/swagger.yaml
openapi: 3.0.0
info:
  title: Aurum Fox Unified Portal API
  description: API documentation for the Aurum Fox Unified Portal backend.
  version: 1.0.0
servers:
  - url: http://localhost:3000/api/v1
    description: Development server
tags:
  - name: Authentication
    description: User authentication and authorization
  - name: Announcements
    description: Public announcements and news
  - name: NFTs
    description: NFT Marketplace and user-owned NFTs
  - name: Photos
    description: Photo gallery and media uploads
  - name: Posts
    description: Blog posts and articles
  - name: Games
    description: Web3 games integration
  - name: Ads
    description: Advertising management

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    User:
      type: object
      properties:
        _id:
          type: string
          description: The unique identifier for the user.
          example: "654321098765432109876543"
        walletAddress:
          type: string
          description: Solana wallet address of the user.
          example: "AfoxUserWallet1234567890abcdefghijklmnopqrstuvw"
          minLength: 32
          maxLength: 44
        role:
          type: string
          enum: [user, admin, developer, publisher, advertiser]
          description: Role of the user.
          example: "user"
        createdAt:
          type: string
          format: date-time
          description: Date and time when the user was created.
        updatedAt:
          type: string
          format: date-time
          description: Date and time when the user was last updated.
        solanaBalance:
          type: number
          format: float
          description: Current Solana balance of the user's wallet.
          example: 1.25
        splTokens:
          type: array
          description: List of SPL tokens held by the user.
          items:
            type: object
            properties:
              mint:
                type: string
                example: "TokenMintAddress1234567890abcdefghijklmnopqrstuvw"
              balance:
                type: number
                format: float
                example: 100.5
      required:
        - _id
        - walletAddress
        - role
    AuthResponse:
      type: object
      properties:
        success:
          type: boolean
          example: true
        message:
          type: string
          example: "Login successful"
        token:
          type: string
          description: JWT token for authentication.
          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        user:
          allOf:
            - $ref: '#/components/schemas/User'
            - type: object
              properties:
                password:
                  type: string
                  readOnly: true
                  description: Password field is never returned.
      required:
        - success
        - message
        - token
        - user
    Announcement:
      type: object
      properties:
        _id:
          type: string
          description: The unique identifier for the announcement.
          example: "654321098765432109876543"
        text:
          type: string
          description: The content of the announcement.
          example: "Welcome to our new platform!"
          minLength: 5
          maxLength: 500
        author:
          type: string
          description: User ID of the announcement creator.
          example: "654321098765432109876543"
        createdAt:
          type: string
          format: date-time
          description: Date and time when the announcement was created.
        updatedAt:
          type: string
          format: date-time
          description: Date and time when the announcement was last updated.
      required:
        - _id
        - text
        - createdAt
        - updatedAt
    NFTAttribute:
      type: object
      properties:
        trait_type:
          type: string
          example: "Color"
        value:
          type: string
          example: "Red"
      required:
        - trait_type
        - value
    NFT:
      type: object
      properties:
        _id:
          type: string
          description: Unique ID of the NFT in the database.
          example: "654321098765432109876543"
        name:
          type: string
          description: Name of the NFT.
          example: "Aurum Fox Genesis #001"
        description:
          type: string
          description: Description of the NFT.
          example: "First ever NFT from Aurum Fox collection."
        image:
          type: string
          format: uri
          description: URL to the NFT's image.
          example: "http://localhost:3000/uploads/nft_genesis_001.png"
        mint:
          type: string
          description: Solana mint address of the NFT.
          example: "AfoxMintAddress1234567890abcdefghijklmnopqrstuvw"
        owner:
          type: string
          description: Solana wallet address of the current owner.
          example: "CurrentOwnerWallet1234567890abcdefghijklmnopqrstuvw"
        isListed:
          type: boolean
          description: Whether the NFT is currently listed for sale.
          example: false
        price:
          type: number
          format: float
          description: The price if the NFT is listed for sale.
          example: 5.5
        listedAt:
          type: string
          format: date-time
          description: Date and time when the NFT was listed.
        listingDuration:
          type: number
          description: Duration of the listing in days.
          example: 7
        history:
          type: array
          items:
            type: object
            properties:
              type:
                type: string
                enum: [Mint, Listed, Bought, Transferred, Burned, MetadataUpdated]
              from:
                type: string
                description: Wallet address of sender (for transfers/buys).
                example: "PrevOwnerWallet1234567890abcdefghijklmnopqr"
              to:
                type: string
                description: Wallet address of recipient (for mints/transfers/buys).
                example: "NewOwnerWallet1234567890abcdefghijklmnopqr"
              price:
                type: number
                format: float
                description: Price of transaction (if applicable).
                example: 5.5
              timestamp:
                type: string
                format: date-time
          description: History of the NFT (minting, transfers, sales).
        attributes:
          type: array
          items:
            $ref: '#/components/schemas/NFTAttribute'
          description: Key-value attributes of the NFT.
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
      required:
        - _id
        - name
        - image
        - mint
        - owner
        - isListed
    Photo:
      type: object
      properties:
        _id:
          type: string
          description: Unique ID of the photo in the database.
          example: "654321098765432109876543"
        title:
          type: string
          description: Title of the photo.
          example: "Sunset over Nice"
          minLength: 3
          maxLength: 100
        description:
          type: string
          description: Description of the photo.
          example: "A beautiful sunset captured from the Promenade des Anglais."
          maxLength: 1000
        imageUrl:
          type: string
          format: uri
          description: URL to the hosted image file.
          example: "http://localhost:3000/uploads/sunset_nice_12345.jpg"
        filename:
          type: string
          description: Original filename on the server.
          example: "sunset_nice_12345.jpg"
        mimetype:
          type: string
          description: MIME type of the uploaded file.
          example: "image/jpeg"
        size:
          type: integer
          description: Size of the file in bytes.
          example: 1234567
        creatorWallet:
          type: string
          description: Solana wallet address of the user who uploaded the photo.
          example: "UploaderWallet1234567890abcdefghijklmnopqrstuvw"
        creator:
          type: string
          description: User ID of the user who uploaded the photo.
          example: "654321098765432109876543"
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
      required:
        - _id
        - title
        - imageUrl
        - filename
        - mimetype
        - size
        - creatorWallet
        - creator
        - createdAt
        - updatedAt
    ErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          example: false
        message:
          type: string
          example: "Validation Error"
        stack:
          type: string
          description: Stack trace (only in development).
          nullable: true
        details:
          type: array
          items:
            type: string
          example: ["Wallet address must be a valid Solana wallet address (base58 encoded, 32-44 characters)."]
          nullable: true
      required:
        - success
        - message

paths:
  /auth/register:
    post:
      summary: Register a new user
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                walletAddress:
                  type: string
                  description: Unique Solana wallet address for the new user.
                  example: "NewUserWallet1234567890abcdefghijklmnopqrstuvw"
                  minLength: 32
                  maxLength: 44
                password:
                  type: string
                  description: User's password (min 8 characters).
                  example: "securepassword123"
                  minLength: 8
                  maxLength: 64
              required:
                - walletAddress
                - password
      responses:
        '201':
          description: User registered successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '400':
          description: Bad request (e.g., validation error, duplicate wallet address)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
  /auth/login:
    post:
      summary: Log in a user and get JWT token
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                walletAddress:
                  type: string
                  description: Registered Solana wallet address.
                  example: "ExistingUserWallet1234567890abcdefghijklmnopqrstuvw"
                password:
                  type: string
                  description: User's password.
                  example: "securepassword123"
              required:
                - walletAddress
                - password
      responses:
        '200':
          description: User logged in successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '400':
          description: Bad request (e.g., validation error, missing fields)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized (Invalid wallet address or password)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
  /auth/me:
    get:
      summary: Get current authenticated user's profile
      tags:
        - Authentication
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Current user profile fetched successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    $ref: '#/components/schemas/User'
        '401':
          description: Unauthorized (No token or invalid token)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: User not found (e.g., token valid but user deleted)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /announcements:
    get:
      summary: Get all announcements
      tags:
        - Announcements
      responses:
        '200':
          description: A list of announcements
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  count:
                    type: integer
                    example: 2
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Announcement'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
    post:
      summary: Create a new announcement (Admin only)
      tags:
        - Announcements
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                text:
                  type: string
                  description: The content of the announcement.
                  example: "Important update: New features coming soon!"
                  minLength: 5
                  maxLength: 500
              required:
                - text
      responses:
        '201':
          description: Announcement created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "Announcement published successfully"
                  data:
                    $ref: '#/components/schemas/Announcement'
        '400':
          description: Bad request (validation error)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized (Missing or invalid token)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Forbidden (User not an admin)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
  /announcements/{id}:
    parameters:
      - in: path
        name: id
        schema:
          type: string
          pattern: '^[0-9a-fA-F]{24}$' # MongoDB ObjectId pattern
        required: true
        description: The ID of the announcement.
    put:
      summary: Update an announcement by ID (Admin only)
      tags:
        - Announcements
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                text:
                  type: string
                  description: The updated content of the announcement.
                  example: "Updated announcement text for the portal."
                  minLength: 5
                  maxLength: 500
              required:
                - text
      responses:
        '200':
          description: Announcement updated successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "Announcement updated successfully"
                  data:
                    $ref: '#/components/schemas/Announcement'
        '400':
          description: Bad request (invalid ID format or validation error)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Forbidden (User not an admin)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Announcement not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
    delete:
      summary: Delete an announcement by ID (Admin only)
      tags:
        - Announcements
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Announcement deleted successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "Announcement deleted successfully"
        '400':
          description: Bad request (invalid ID format)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Forbidden (User not an admin)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Announcement not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /nfts:
    get:
      summary: Get all NFTs (with optional filters, pagination, and sorting)
      tags:
        - NFTs
      parameters:
        - in: query
          name: owner
          schema:
            type: string
            description: Filter NFTs by owner's Solana wallet address.
            example: "OwnerWalletFilter1234567890abcdefghijklmnopq"
        - in: query
          name: isListed
          schema:
            type: boolean
            description: Filter NFTs by their listing status (true for listed, false for unlisted).
            example: true
        - in: query
          name: limit
          schema:
            type: integer
            minimum: 1
            default: 10
          description: Maximum number of NFTs to return.
        - in: query
          name: offset
          schema:
            type: integer
            minimum: 0
            default: 0
          description: Number of NFTs to skip (for pagination).
        - in: query
          name: minPrice
          schema:
            type: number
            format: float
            minimum: 0
          description: Filter NFTs with a minimum listing price.
        - in: query
          name: maxPrice
          schema:
            type: number
            format: float
            minimum: 0
          description: Filter NFTs with a maximum listing price.
        - in: query
          name: sortBy
          schema:
            type: string
            enum: [createdAt, price, name]
            default: createdAt
          description: Field to sort by.
        - in: query
          name: sortOrder
          schema:
            type: string
            enum: [asc, desc]
            default: desc
          description: Sort order (ascending or descending).
      responses:
        '200':
          description: A list of NFTs.
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  count:
                    type: integer
                    example: 10
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/NFT'
        '400':
          description: Bad request (validation error for query parameters)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
    post:
      summary: Create a new NFT (Simulated Mint - Admin/Developer only)
      tags:
        - NFTs
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          multipart/form-data: # Use multipart/form-data for file uploads
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: Name of the NFT.
                  example: "Aurum Fox Collectible #002"
                  minLength: 3
                  maxLength: 100
                description:
                  type: string
                  description: Description of the NFT.
                  example: "A unique digital collectible from the Aurum Fox ecosystem."
                  maxLength: 1000
                owner:
                  type: string
                  description: Initial Solana wallet address of the NFT owner.
                  example: "InitialOwnerWallet1234567890abcdefghijklmnopq"
                  minLength: 32
                  maxLength: 44
                attributes:
                  type: string
                  format: json # Joi expects JSON string for array/object
                  description: JSON string of an array of NFT attributes (e.g., '[{"trait_type": "Background", "value": "Blue"}]').
                  example: '[{"trait_type": "Level", "value": "Epic"}, {"trait_type": "Element", "value": "Fire"}]'
                image:
                  type: string
                  format: binary # For file upload
                  description: Image file for the NFT.
      responses:
        '201':
          description: NFT created and simulated mint successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "NFT created and simulated mint successfully"
                  data:
                    $ref: '#/components/schemas/NFT'
        '400':
          description: Bad request (validation error, missing image)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Forbidden (User not admin/developer)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /nfts/{id}:
    parameters:
      - in: path
        name: id
        schema:
          type: string
          pattern: '^[0-9a-fA-F]{24}$' # MongoDB ObjectId pattern
        required: true
        description: The ID of the NFT.
    get:
      summary: Get single NFT by ID
      tags:
        - NFTs
      responses:
        '200':
          description: NFT data fetched successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    $ref: '#/components/schemas/NFT'
        '400':
          description: Bad request (invalid ID format)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: NFT not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
    put:
      summary: Update an NFT's metadata by ID (Owner or Admin only)
      tags:
        - NFTs
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          multipart/form-data: # Use multipart/form-data for image update
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: Updated name of the NFT.
                  example: "Aurum Fox Elite #001"
                  minLength: 3
                  maxLength: 100
                description:
                  type: string
                  description: Updated description of the NFT.
                  example: "An elite collectible with enhanced features."
                  maxLength: 1000
                attributes:
                  type: string
                  format: json # Joi expects JSON string for array/object
                  description: JSON string of an array of updated NFT attributes.
                  example: '[{"trait_type": "Level", "value": "Elite"}, {"trait_type": "Color", "value": "Gold"}]'
                image:
                  type: string
                  format: binary # For file upload
                  description: New image file for the NFT (optional).
              minProperties: 1 # At least one field must be provided
      responses:
        '200':
          description: NFT metadata updated successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "NFT updated successfully"
                  data:
                    $ref: '#/components/schemas/NFT'
        '400':
          description: Bad request (invalid ID, validation error, no fields to update)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Forbidden (Not owner or admin)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: NFT not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
    delete:
      summary: Delete an NFT (Simulated Burn - Admin only)
      tags:
        - NFTs
      security:
        - bearerAuth: []
      responses:
        '200':
          description: NFT deleted and simulated burn successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "NFT deleted and simulated burn successfully"
        '400':
          description: Bad request (invalid ID format)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Forbidden (User not admin)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: NFT not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /nfts/{id}/list:
    post:
      summary: List an NFT for sale (Owner only)
      tags:
        - NFTs
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          schema:
            type: string
            pattern: '^[0-9a-fA-F]{24}$'
          required: true
          description: The ID of the NFT to list.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                price:
                  type: number
                  format: float
                  description: The price in SOL for which to list the NFT.
                  example: 1.5
                  minimum: 0.000000001
                duration:
                  type: integer
                  description: The duration of the listing in days.
                  example: 7
                  minimum: 1
                  maximum: 365
              required:
                - price
                - duration
      responses:
        '200':
          description: NFT listed for sale successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "NFT listed for sale successfully"
                  data:
                    $ref: '#/components/schemas/NFT'
        '400':
          description: Bad request (invalid ID, validation error, NFT already listed)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Forbidden (Not the owner of the NFT)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: NFT not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /nfts/{id}/buy:
    post:
      summary: Buy an NFT (Authenticated user)
      tags:
        - NFTs
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          schema:
            type: string
            pattern: '^[0-9a-fA-F]{24}$'
          required: true
          description: The ID of the NFT to buy.
      responses:
        '200':
          description: NFT purchased successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "NFT purchased successfully"
                  data:
                    $ref: '#/components/schemas/NFT'
        '400':
          description: Bad request (invalid ID, NFT not listed, insufficient funds)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Forbidden (e.g., trying to buy own NFT, or insufficient funds)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: NFT not found or not currently listed for sale
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /photos:
    get:
      summary: Get all photos
      tags:
        - Photos
      responses:
        '200':
          description: A list of photos.
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  count:
                    type: integer
                    example: 5
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Photo'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /photos/upload:
    post:
      summary: Upload a new photo (Authenticated user)
      tags:
        - Photos
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                title:
                  type: string
                  description: Title of the photo.
                  example: "My Vacation Snapshot"
                  minLength: 3
                  maxLength: 100
                description:
                  type: string
                  description: Optional description of the photo.
                  example: "Beautiful view from the mountain top."
                  maxLength: 1000
                photo: # This name must match the field name in multer middleware
                  type: string
                  format: binary
                  description: The image file to upload.
              required:
                - title
                - photo
      responses:
        '201':
          description: Photo uploaded successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "Photo uploaded successfully."
                  photo:
                    $ref: '#/components/schemas/Photo'
        '400':
          description: Bad request (no file uploaded, validation errors)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Forbidden (User not authorized to upload)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error (e.g., database error, file system error)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /photos/{id}:
    parameters:
      - in: path
        name: id
        schema:
          type: string
          pattern: '^[0-9a-fA-F]{24}$' # MongoDB ObjectId pattern
        required: true
        description: The ID of the photo.
    delete:
      summary: Delete a photo by ID (Owner or Admin only)
      tags:
        - Photos
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Photo deleted successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "Photo deleted successfully."
        '400':
          description: Bad request (invalid ID format)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Forbidden (User not owner or admin)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Photo not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error (e.g., file system error, database error)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
