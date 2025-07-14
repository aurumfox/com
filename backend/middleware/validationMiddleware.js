// ... внутри schemas
photos: {
    upload: Joi.object({
        title: Joi.string().trim().min(3).max(100).required()
            .messages({
                'string.empty': 'Photo title cannot be empty.',
                'string.min': 'Photo title must be at least 3 characters long.',
                'string.max': 'Photo title cannot exceed 100 characters.',
                'any.required': 'Photo title is required.'
            }),
        description: Joi.string().trim().max(500).optional().allow('') // Adjust max length if needed
            .messages({
                'string.max': 'Description cannot exceed 500 characters.'
            })
        // creatorWallet is derived from req.user, not from body.
        // If you did pass it in body, it would be joiSolanaAddress.
    })
},
// ...
