{
  "address": "BqqKdzVPiYt3cKKdgKsSir2ruVJaSi9bDrs5V8FbqeN8",
  "metadata": {
    "name": "start",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "add_new_pool_tier",
      "discriminator": [
        110,
        246,
        12,
        114,
        151,
        197,
        27,
        99
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lockup",
          "type": "i64"
        },
        {
          "name": "multiplier",
          "type": "u16"
        }
      ]
    },
    {
      "name": "admin_emergency_thaw",
      "discriminator": [
        177,
        3,
        155,
        99,
        99,
        49,
        69,
        42
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "user_st_ata",
          "writable": true
        },
        {
          "name": "st_mint"
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "apply_config_change",
      "discriminator": [
        18,
        84,
        124,
        38,
        182,
        155,
        7,
        238
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "claim_all_rewards",
      "discriminator": [
        132,
        203,
        246,
        173,
        206,
        240,
        85,
        120
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "admin_fee_vault",
          "writable": true
        },
        {
          "name": "user_rewards_ata",
          "writable": true
        },
        {
          "name": "reward_mint",
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "pool_indices",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "claim_pending_change",
      "discriminator": [
        211,
        245,
        119,
        76,
        137,
        218,
        88,
        170
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "claiming_authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "close_pool",
      "discriminator": [
        140,
        189,
        209,
        23,
        239,
        62,
        239,
        11
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "admin_fee_vault",
          "writable": true
        },
        {
          "name": "dao_treasury_vault",
          "writable": true
        },
        {
          "name": "defaulter_treasury_vault",
          "writable": true
        },
        {
          "name": "receiver",
          "writable": true
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "close_staking_account",
      "discriminator": [
        65,
        169,
        104,
        239,
        107,
        62,
        122,
        98
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "user_staking",
          "writable": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "user_staking"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "collateralize_lending",
      "discriminator": [
        230,
        88,
        50,
        32,
        103,
        191,
        23,
        251
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "user_staking",
          "writable": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "guardian",
          "writable": true,
          "signer": true
        },
        {
          "name": "lending_authority",
          "signer": true
        },
        {
          "name": "oracle_feeds"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_lending_amount",
          "type": "u64"
        },
        {
          "name": "min_health_factor",
          "type": "u64"
        }
      ]
    },
    {
      "name": "decollateralize_lending",
      "discriminator": [
        179,
        152,
        148,
        255,
        202,
        223,
        83,
        80
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "user_staking",
          "writable": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "user_staking",
          "writable": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "st_mint",
          "writable": true
        },
        {
          "name": "user_source_ata",
          "writable": true
        },
        {
          "name": "user_st_ata",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "pool_index",
          "type": "u8"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "emergency_reset_reward_index",
      "discriminator": [
        240,
        51,
        116,
        67,
        28,
        194,
        168,
        159
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "emergency_stop_rewards",
      "discriminator": [
        218,
        89,
        48,
        222,
        149,
        108,
        20,
        229
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "finalize_blacklist",
      "discriminator": [
        60,
        145,
        13,
        73,
        159,
        145,
        167,
        191
      ],
      "accounts": [
        {
          "name": "pool_state"
        },
        {
          "name": "governance_authority",
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "target_user_staking",
          "writable": true
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "force_unlock_collateral",
      "discriminator": [
        169,
        129,
        241,
        145,
        157,
        176,
        107,
        148
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "user_staking",
          "writable": true
        },
        {
          "name": "lending_authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "defaulter_treasury_vault",
          "writable": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "user_st_ata",
          "writable": true
        },
        {
          "name": "st_mint",
          "writable": true
        },
        {
          "name": "reward_mint",
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "loan_id",
          "type": "u64"
        }
      ]
    },
    {
      "name": "init_vault_admin_fee",
      "discriminator": [
        58,
        216,
        78,
        115,
        13,
        64,
        73,
        71
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "admin_fee_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  102,
                  101,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "pool_state"
              }
            ]
          }
        },
        {
          "name": "admin_authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "reward_mint"
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "init_vault_dao_treasury",
      "discriminator": [
        120,
        206,
        117,
        210,
        249,
        164,
        204,
        11
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "dao_treasury_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  97,
                  111,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool_state"
              }
            ]
          }
        },
        {
          "name": "admin_authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "reward_mint"
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "init_vault_defaulter_treasury",
      "discriminator": [
        111,
        116,
        4,
        98,
        166,
        200,
        86,
        139
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "defaulter_treasury_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  102,
                  97,
                  117,
                  108,
                  116,
                  101,
                  114,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool_state"
              }
            ]
          }
        },
        {
          "name": "admin_authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "reward_mint"
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "init_vaults_part_a",
      "discriminator": [
        178,
        224,
        183,
        148,
        61,
        125,
        41,
        66
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true
        },
        {
          "name": "vault",
          "docs": [
            "Хранилище должно принадлежать pool_state (как PDA-владельцу)"
          ],
          "writable": true
        },
        {
          "name": "st_mint",
          "docs": [
            "Mint для stTokens должен иметь pool_state как Mint Authority"
          ]
        },
        {
          "name": "admin_authority",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "initialize_base",
      "discriminator": [
        1,
        199,
        128,
        248,
        58,
        232,
        116,
        133
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "reward_mint"
        },
        {
          "name": "initializer",
          "writable": true,
          "signer": true
        },
        {
          "name": "program_data",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  161,
                  23,
                  98,
                  157,
                  91,
                  221,
                  74,
                  125,
                  198,
                  5,
                  44,
                  99,
                  163,
                  33,
                  177,
                  98,
                  69,
                  95,
                  154,
                  58,
                  107,
                  246,
                  108,
                  24,
                  201,
                  230,
                  131,
                  194,
                  174,
                  111,
                  235,
                  29
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                2,
                168,
                246,
                145,
                78,
                136,
                161,
                176,
                226,
                16,
                21,
                62,
                247,
                99,
                174,
                43,
                0,
                194,
                185,
                61,
                22,
                193,
                36,
                210,
                192,
                83,
                122,
                16,
                4,
                128,
                0,
                0
              ]
            }
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "governance_authority"
        },
        {
          "name": "admin_authority"
        },
        {
          "name": "lending_authority"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "InitializePoolConfigArgs"
            }
          }
        }
      ]
    },
    {
      "name": "initialize_user_stake",
      "discriminator": [
        248,
        96,
        76,
        185,
        77,
        56,
        18,
        0
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "user_staking",
          "writable": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "pool_index",
          "type": "u8"
        }
      ]
    },
    {
      "name": "manual_reset_dao_cap",
      "discriminator": [
        110,
        60,
        27,
        204,
        5,
        249,
        174,
        116
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "mint_reward_tokens",
      "discriminator": [
        199,
        21,
        64,
        66,
        226,
        107,
        121,
        29
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "reward_mint",
          "writable": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "destination_ata",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "propose_active_pools_count",
      "discriminator": [
        55,
        203,
        177,
        107,
        57,
        207,
        221,
        22
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_count",
          "type": "u8"
        }
      ]
    },
    {
      "name": "propose_config_change",
      "discriminator": [
        165,
        15,
        231,
        227,
        223,
        229,
        247,
        119
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_early_exit",
          "type": "u16"
        },
        {
          "name": "new_multipliers",
          "type": {
            "array": [
              "u16",
              5
            ]
          }
        }
      ]
    },
    {
      "name": "propose_reward_rate",
      "discriminator": [
        133,
        202,
        49,
        65,
        72,
        3,
        145,
        194
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_rate",
          "type": "u128"
        }
      ]
    },
    {
      "name": "rescue_tokens",
      "discriminator": [
        222,
        81,
        199,
        209,
        182,
        62,
        62,
        186
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "mistake_vault",
          "writable": true
        },
        {
          "name": "destination_ata",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "revoke_freeze_authority",
      "discriminator": [
        84,
        177,
        206,
        249,
        25,
        1,
        237,
        159
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "reward_mint",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "revoke_mint_authority",
      "discriminator": [
        140,
        52,
        61,
        238,
        209,
        157,
        189,
        32
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "reward_mint",
          "writable": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "set_pause",
      "discriminator": [
        63,
        32,
        154,
        2,
        56,
        103,
        79,
        45
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "global_pause",
          "type": "bool"
        }
      ]
    },
    {
      "name": "set_pending_change",
      "discriminator": [
        15,
        164,
        137,
        201,
        230,
        209,
        55,
        129
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "new_authority_info",
          "docs": [
            "поэтому десериализация данных аккаунта не требуется."
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_authority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "sweep_vault",
      "discriminator": [
        137,
        92,
        9,
        1,
        140,
        237,
        214,
        140
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "dao_treasury_vault",
          "writable": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "reward_mint",
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unstake",
      "discriminator": [
        90,
        95,
        107,
        42,
        205,
        124,
        50,
        225
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          },
          "relations": [
            "user_staking"
          ]
        },
        {
          "name": "user_staking",
          "writable": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "user_staking"
          ]
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "dao_treasury_vault",
          "writable": true
        },
        {
          "name": "admin_fee_vault",
          "writable": true
        },
        {
          "name": "user_rewards_ata",
          "writable": true
        },
        {
          "name": "user_st_ata",
          "writable": true
        },
        {
          "name": "st_mint",
          "writable": true
        },
        {
          "name": "reward_mint",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "pool_index",
          "type": "u8"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "update_active_pools_count",
      "discriminator": [
        76,
        219,
        184,
        174,
        89,
        25,
        76,
        144
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_count",
          "type": "u8"
        }
      ]
    },
    {
      "name": "update_blacklist",
      "discriminator": [
        198,
        184,
        249,
        56,
        199,
        62,
        93,
        38
      ],
      "accounts": [
        {
          "name": "pool_state"
        },
        {
          "name": "governance_authority",
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "target_user_staking",
          "writable": true
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "action",
          "type": {
            "defined": {
              "name": "BlacklistAction"
            }
          }
        }
      ]
    },
    {
      "name": "update_dao_withdrawal_limit",
      "discriminator": [
        110,
        17,
        0,
        100,
        177,
        206,
        44,
        17
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_limit",
          "type": "u64"
        }
      ]
    },
    {
      "name": "update_early_exit_fee",
      "discriminator": [
        157,
        224,
        159,
        51,
        169,
        58,
        15,
        32
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_fee_bps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "update_fees",
      "discriminator": [
        225,
        27,
        13,
        6,
        69,
        84,
        172,
        191
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "admin_share_bps",
          "type": "u16"
        },
        {
          "name": "early_exit_bps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "update_lockup_durations",
      "discriminator": [
        96,
        149,
        183,
        10,
        254,
        216,
        133,
        156
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_lockup_seconds",
          "type": {
            "array": [
              "i64",
              5
            ]
          }
        }
      ]
    },
    {
      "name": "update_min_initial_stake",
      "discriminator": [
        214,
        246,
        105,
        136,
        46,
        157,
        119,
        176
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_min_stake",
          "type": "u64"
        }
      ]
    },
    {
      "name": "update_pool_tiers_config",
      "discriminator": [
        33,
        85,
        22,
        253,
        75,
        4,
        223,
        117
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_lockups",
          "type": {
            "array": [
              "i64",
              5
            ]
          }
        },
        {
          "name": "new_multipliers",
          "type": {
            "array": [
              "u16",
              5
            ]
          }
        },
        {
          "name": "new_active_count",
          "type": "u8"
        }
      ]
    },
    {
      "name": "update_reward_mint_address",
      "discriminator": [
        53,
        20,
        177,
        33,
        101,
        250,
        56,
        32
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_mint",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "update_reward_rate",
      "discriminator": [
        105,
        157,
        0,
        185,
        21,
        144,
        163,
        159
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_rate",
          "type": "u128"
        }
      ]
    },
    {
      "name": "update_sweep_threshold",
      "discriminator": [
        119,
        255,
        133,
        127,
        183,
        142,
        222,
        194
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_threshold",
          "type": "u64"
        }
      ]
    },
    {
      "name": "update_system_durations",
      "discriminator": [
        82,
        17,
        255,
        93,
        0,
        52,
        72,
        30
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gov_lock",
          "type": "i64"
        },
        {
          "name": "lending_grace",
          "type": "i64"
        }
      ]
    },
    {
      "name": "update_tier_multipliers",
      "discriminator": [
        25,
        132,
        162,
        53,
        130,
        129,
        248,
        23
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_multipliers",
          "type": {
            "array": [
              "u16",
              5
            ]
          }
        }
      ]
    },
    {
      "name": "update_tiers",
      "discriminator": [
        165,
        231,
        46,
        8,
        16,
        111,
        129,
        212
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "new_multipliers",
          "type": {
            "array": [
              "u16",
              5
            ]
          }
        }
      ]
    },
    {
      "name": "withdraw_from_admin_fee",
      "discriminator": [
        64,
        21,
        72,
        232,
        207,
        32,
        104,
        74
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "admin_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "admin_fee_vault",
          "writable": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "destination_ata",
          "writable": true
        },
        {
          "name": "reward_mint",
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdraw_from_dao_treasury",
      "discriminator": [
        242,
        220,
        3,
        11,
        249,
        100,
        54,
        78
      ],
      "accounts": [
        {
          "name": "pool_state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "governance_authority",
          "writable": true,
          "signer": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "dao_treasury_vault",
          "writable": true,
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "destination_ata",
          "writable": true
        },
        {
          "name": "admin_fee_vault"
        },
        {
          "name": "reward_mint",
          "relations": [
            "pool_state"
          ]
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "PoolState",
      "discriminator": [
        247,
        237,
        227,
        245,
        215,
        195,
        222,
        70
      ]
    },
    {
      "name": "UserStakingAccount",
      "discriminator": [
        10,
        199,
        254,
        184,
        17,
        28,
        254,
        10
      ]
    }
  ],
  "events": [
    {
      "name": "ClaimEvent",
      "discriminator": [
        93,
        15,
        70,
        170,
        48,
        140,
        212,
        219
      ]
    },
    {
      "name": "CollateralUpdatedEvent",
      "discriminator": [
        209,
        106,
        5,
        5,
        136,
        3,
        145,
        97
      ]
    },
    {
      "name": "StakeEvent",
      "discriminator": [
        226,
        134,
        188,
        173,
        19,
        33,
        75,
        175
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "AlreadyInitialized",
      "msg": "Account already initialized."
    },
    {
      "code": 6001,
      "name": "NotInitialized",
      "msg": "Not initialized."
    },
    {
      "code": 6002,
      "name": "InvalidPoolIndex",
      "msg": "Invalid pool index provided."
    },
    {
      "code": 6003,
      "name": "ZeroStakedAmount",
      "msg": "Zero staked amount."
    },
    {
      "code": 6004,
      "name": "ZeroAmount",
      "msg": "Amount must be greater than zero."
    },
    {
      "code": 6005,
      "name": "LockupTooShort",
      "msg": "Lockup duration is shorter than current lockup."
    },
    {
      "code": 6006,
      "name": "LockupNotExpired",
      "msg": "Lockup period has not expired."
    },
    {
      "code": 6007,
      "name": "GlobalPause",
      "msg": "Global pause is active."
    },
    {
      "code": 6008,
      "name": "InsufficientStake",
      "msg": "Insufficient stake to cover collateral amount."
    },
    {
      "code": 6009,
      "name": "CollateralLock",
      "msg": "Cannot unstake collateralized tokens."
    },
    {
      "code": 6010,
      "name": "MathOverflow",
      "msg": "Math Overflow occurred."
    },
    {
      "code": 6011,
      "name": "MathUnderflow",
      "msg": "Math Underflow occurred."
    },
    {
      "code": 6012,
      "name": "InsufficientVaultBalance",
      "msg": "Insufficient tokens in the vault for transfer."
    },
    {
      "code": 6013,
      "name": "AmountTooLarge",
      "msg": "Amount is too large for sweep."
    },
    {
      "code": 6014,
      "name": "InvalidInput",
      "msg": "Invalid input parameter."
    },
    {
      "code": 6015,
      "name": "NoPendingChange",
      "msg": "No pending governance change."
    },
    {
      "code": 6016,
      "name": "TimeLockNotExpired",
      "msg": "Timelock period for governance change has not expired."
    },
    {
      "code": 6017,
      "name": "StakeStillExists",
      "msg": "Stake still exists in the account."
    },
    {
      "code": 6018,
      "name": "GracePeriodExpired",
      "msg": "Grace period for lending has expired."
    },
    {
      "code": 6019,
      "name": "GracePeriodNotExpired",
      "msg": "Lending grace period has not expired yet."
    },
    {
      "code": 6020,
      "name": "ZeroCollateral",
      "msg": "Zero collateral amount."
    },
    {
      "code": 6021,
      "name": "DaoLimitReached",
      "msg": "DAO daily withdrawal limit reached."
    },
    {
      "code": 6022,
      "name": "Unauthorized",
      "msg": "Unauthorized access."
    },
    {
      "code": 6023,
      "name": "InvalidTokenMint",
      "msg": "Token account uses an invalid mint."
    },
    {
      "code": 6024,
      "name": "InsufficientCollateral",
      "msg": "Insufficient collateral staked."
    },
    {
      "code": 6025,
      "name": "InvalidAmount",
      "msg": "Invalid amount for operation."
    },
    {
      "code": 6026,
      "name": "InitialStakeTooSmall",
      "msg": "Initial stake too small."
    },
    {
      "code": 6027,
      "name": "InvalidAccountOwner",
      "msg": "Token account has an invalid owner."
    },
    {
      "code": 6028,
      "name": "UnclaimedRewardsExist",
      "msg": "Unclaimed rewards exist."
    },
    {
      "code": 6029,
      "name": "UserIsBlacklisted",
      "msg": "User is blacklisted."
    },
    {
      "code": 6030,
      "name": "TooManyAccounts",
      "msg": "Too many accounts passed in one transaction."
    },
    {
      "code": 6031,
      "name": "InvalidUserStakeAccount",
      "msg": "Invalid user stake account PDA."
    },
    {
      "code": 6032,
      "name": "DuplicatePoolIndex",
      "msg": "Duplicate pool index provided."
    },
    {
      "code": 6033,
      "name": "OperationInSameSlot",
      "msg": "Flash Loan protection: Operation not allowed in same slot."
    },
    {
      "code": 6034,
      "name": "InvalidVault",
      "msg": "Invalid Vault address."
    },
    {
      "code": 6035,
      "name": "ActionForbidden",
      "msg": "Action forbidden."
    },
    {
      "code": 6036,
      "name": "InvalidPoolState",
      "msg": "Invalid Pool State account."
    },
    {
      "code": 6037,
      "name": "InvalidBps",
      "msg": "Invalid Basis Points value. Must be less than or equal to 10000."
    },
    {
      "code": 6038,
      "name": "PoolIndexMismatch",
      "msg": "Pool index mismatch between instruction and account state."
    },
    {
      "code": 6039,
      "name": "InvalidBurnDelta",
      "msg": "Invalid burn delta detected during verification."
    },
    {
      "code": 6040,
      "name": "InconsistentStateDelta",
      "msg": "Inconsistent state delta after execution."
    },
    {
      "code": 6041,
      "name": "UninitializedPool",
      "msg": "Target pool state is uninitialized"
    },
    {
      "code": 6042,
      "name": "InvalidProgramOwner",
      "msg": "Account is owned by an invalid program ID"
    },
    {
      "code": 6043,
      "name": "AccountDelegated",
      "msg": "The token account has an active external delegate, which is insecure"
    },
    {
      "code": 6044,
      "name": "InvalidFreezeAuthority",
      "msg": "The freeze authority must be disabled or owned strictly by the pool PDA"
    },
    {
      "code": 6045,
      "name": "InvalidProgramDataOwner",
      "msg": "Invalid owner for program data account"
    },
    {
      "code": 6046,
      "name": "InvalidAuthority",
      "msg": "Provided authority key is insecure or invalid"
    },
    {
      "code": 6047,
      "name": "InvalidPoolCount",
      "msg": "Exceeded maximum allowed active pools count"
    },
    {
      "code": 6048,
      "name": "InvalidLockupDuration",
      "msg": "Lockup duration is set too high"
    },
    {
      "code": 6049,
      "name": "InvalidZeroAmount",
      "msg": "Value cannot be zero"
    },
    {
      "code": 6050,
      "name": "InvalidTimestamp",
      "msg": "Clock sysvar returned invalid timestamp"
    },
    {
      "code": 6051,
      "name": "UninitializedUserStake",
      "msg": "Target user staking account is uninitialized"
    },
    {
      "code": 6052,
      "name": "ActionForbiddenInSameSlot",
      "msg": "Multiple staking operations are forbidden within the same block slot"
    },
    {
      "code": 6053,
      "name": "RoundingErrorWeightTooSmall",
      "msg": "Calculated stake weight is too small due to a rounding error"
    },
    {
      "code": 6054,
      "name": "InvalidPoolStateMapping",
      "msg": "Provided pool state mapping is invalid for this user account."
    },
    {
      "code": 6055,
      "name": "InvalidSysvar",
      "msg": "Provided sysvar account address is invalid."
    },
    {
      "code": 6056,
      "name": "ExcessivePoolCount",
      "msg": "Exceeded maximum allowed pools active count safety threshold."
    },
    {
      "code": 6057,
      "name": "InvalidStateTransition",
      "msg": "State transition is invalid or not allowed."
    },
    {
      "code": 6058,
      "name": "ArithmeticOverflow",
      "msg": "Arithmetic overflow detected in strict mathematical safety checks."
    },
    {
      "code": 6059,
      "name": "TimelockNotMet",
      "msg": "Governance change timelock period has not been met yet."
    },
    {
      "code": 6060,
      "name": "ExcessiveLockTime",
      "msg": "Lock duration exceeds maximum governance limit."
    },
    {
      "code": 6061,
      "name": "ZeroMultiplier",
      "msg": "Multiplier value cannot be zero."
    },
    {
      "code": 6062,
      "name": "ExcessiveMultiplier",
      "msg": "Multiplier value exceeds maximum allowed threshold."
    },
    {
      "code": 6063,
      "name": "InvalidMultiplierSequence",
      "msg": "Invalid sequence pattern detected in multipliers configuration."
    },
    {
      "code": 6064,
      "name": "NegativeTimeValue",
      "msg": "Time parameter cannot be negative."
    },
    {
      "code": 6065,
      "name": "NegativeLockupTime",
      "msg": "Lockup duration cannot be negative."
    },
    {
      "code": 6066,
      "name": "ExcessiveLockupTime",
      "msg": "Lockup time exceeds maximum allowed protocol limit."
    },
    {
      "code": 6067,
      "name": "InvalidLockupSequence",
      "msg": "Invalid lockup sequence order detected."
    },
    {
      "code": 6068,
      "name": "InvalidBpsRange",
      "msg": "Provided Basis Points value is out of allowed range."
    },
    {
      "code": 6069,
      "name": "InvalidBump",
      "msg": "Provided pool bump seed is invalid."
    },
    {
      "code": 6070,
      "name": "UntrustedFreezeAuthority",
      "msg": "Provided freeze authority is untrusted or invalid."
    },
    {
      "code": 6071,
      "name": "InvalidMintAccountLayout",
      "msg": "Token account layout is invalid."
    },
    {
      "code": 6072,
      "name": "InvalidMintLamports",
      "msg": "Token account lamports balance is invalid."
    },
    {
      "code": 6073,
      "name": "AccountNotFrozen",
      "msg": "Token account must not be frozen."
    },
    {
      "code": 6074,
      "name": "RewardMintMismatch",
      "msg": "Reward mint address mismatch."
    },
    {
      "code": 6075,
      "name": "InvalidGovernanceAuthority",
      "msg": "Provided governance authority is invalid."
    },
    {
      "code": 6076,
      "name": "InvalidAdminFeeVault",
      "msg": "Provided admin fee vault is invalid."
    },
    {
      "code": 6077,
      "name": "InvalidTokenProgram",
      "msg": "Token program ID is invalid."
    },
    {
      "code": 6078,
      "name": "MintAuthorityAlreadyRevoked",
      "msg": "Mint authority has already been revoked."
    },
    {
      "code": 6079,
      "name": "UserWeightExceedsGlobalTotal",
      "msg": "User calculated weight exceeds global total pool weight."
    },
    {
      "code": 6080,
      "name": "PendingRewardsExceedGlobalPool",
      "msg": "Pending rewards exceed global pool capacity."
    },
    {
      "code": 6081,
      "name": "UserNotInitialized",
      "msg": "User profile is not initialized."
    },
    {
      "code": 6082,
      "name": "GlobalIndexBehindUserIndex",
      "msg": "Global index is behind the user index state."
    },
    {
      "code": 6083,
      "name": "UserStakeExceedsGlobalTotal",
      "msg": "User stake amount exceeds global total staked amount."
    },
    {
      "code": 6084,
      "name": "FailedToTimestampSync",
      "msg": "Failed to synchronize with clock timestamp."
    },
    {
      "code": 6085,
      "name": "ExcessiveTimeDeltaExploit",
      "msg": "Excessive time delta exploit detected."
    },
    {
      "code": 6086,
      "name": "RewardPoolCapExceeded",
      "msg": "Reward pool capacity has been exceeded."
    },
    {
      "code": 6087,
      "name": "SelfTransferProhibited",
      "msg": "Self transfer of tokens within the same account is prohibited."
    },
    {
      "code": 6088,
      "name": "InvalidMintAddress",
      "msg": "The provided mint account address is invalid."
    },
    {
      "code": 6089,
      "name": "OwnerSignatureRequired",
      "msg": "Owner signature is required for this operation."
    },
    {
      "code": 6090,
      "name": "InvalidPDASeeds",
      "msg": "The provided PDA seeds are invalid and do not match."
    },
    {
      "code": 6091,
      "name": "InvalidPoolAuthority",
      "msg": "The provided pool authority PDA is invalid."
    },
    {
      "code": 6092,
      "name": "StateCorruptionDetected",
      "msg": "State corruption detected during protocol operations."
    },
    {
      "code": 6093,
      "name": "MultipliersAlreadySetToThisValue",
      "msg": "The new tier multipliers configuration already has this exact value."
    },
    {
      "code": 6094,
      "name": "InconsistentStateDeltaError",
      "msg": "Calculated state delta is inconsistent with the protocol state."
    },
    {
      "code": 6095,
      "name": "InvalidDepositAmount",
      "msg": "The provided deposit amount is invalid and cannot be zero."
    },
    {
      "code": 6096,
      "name": "InvalidClaimAmount",
      "msg": "The provided claim amount is invalid and cannot be zero."
    },
    {
      "code": 6097,
      "name": "UnauthorizedLamportMutation",
      "msg": "Unauthorized lamport mutation was detected."
    },
    {
      "code": 6098,
      "name": "MultiplierFloorViolation",
      "msg": "Calculated multiplier violates the minimum floor constraint."
    },
    {
      "code": 6099,
      "name": "MultiplierExceedsCeiling",
      "msg": "Calculated multiplier exceeds the maximum ceiling constraint."
    },
    {
      "code": 6100,
      "name": "ZeroWeight",
      "msg": "Provided user weight amount cannot be zero."
    },
    {
      "code": 6101,
      "name": "InvalidTimeTravelExploit",
      "msg": "Invalid time travel exploit detected."
    },
    {
      "code": 6102,
      "name": "FeesAlreadySetToThisValue",
      "msg": "The fees configuration is already set to this specific value."
    },
    {
      "code": 6103,
      "name": "InvalidPoolsCount",
      "msg": "Invalid pools count."
    },
    {
      "code": 6104,
      "name": "ExcessivePoolsCount",
      "msg": "Excessive pools count."
    },
    {
      "code": 6105,
      "name": "PoolStillHasActiveStakers",
      "msg": "Pool still has active stakers."
    },
    {
      "code": 6106,
      "name": "ExcessiveCombinedFees",
      "msg": "Excessive combined fees."
    },
    {
      "code": 6107,
      "name": "NegativeLockupDuration",
      "msg": "Negative lockup duration."
    },
    {
      "code": 6108,
      "name": "ExcessiveLockupDuration",
      "msg": "Excessive lockup duration."
    },
    {
      "code": 6109,
      "name": "GovernanceLockTooShort",
      "msg": "Governance lock is too short."
    },
    {
      "code": 6110,
      "name": "LendingGraceTooShort",
      "msg": "Lending grace period is too short."
    },
    {
      "code": 6111,
      "name": "MintAddressAlreadySet",
      "msg": "Mint address is already set."
    },
    {
      "code": 6112,
      "name": "ActivePoolsFloorViolation",
      "msg": "Active pools floor violation."
    },
    {
      "code": 6113,
      "name": "NegativeGovernanceLockTime",
      "msg": "Negative governance lock time."
    },
    {
      "code": 6114,
      "name": "NegativeLendingGraceTime",
      "msg": "Negative lending grace time."
    },
    {
      "code": 6115,
      "name": "RewardRateFloorViolation",
      "msg": "Reward rate floor violation."
    },
    {
      "code": 6116,
      "name": "ExcessiveGovernanceLockTime",
      "msg": "Excessive governance lock time."
    },
    {
      "code": 6117,
      "name": "ExcessiveLendingGraceTime",
      "msg": "Excessive lending grace time."
    },
    {
      "code": 6118,
      "name": "ExcessiveLendingGraceTimeLock",
      "msg": "Excessive lending grace time lock."
    },
    {
      "code": 6119,
      "name": "PendingConfigAlreadyExists",
      "msg": "Pending configuration already exists."
    },
    {
      "code": 6120,
      "name": "InvalidLockupTime",
      "msg": "Invalid lockup time."
    },
    {
      "code": 6121,
      "name": "AccountAlreadyBlacklisted",
      "msg": "Account is already blacklisted."
    },
    {
      "code": 6122,
      "name": "AccountThawFailed",
      "msg": "Account thaw failed."
    },
    {
      "code": 6123,
      "name": "PoolMustBePaused",
      "msg": "Pool must be paused."
    },
    {
      "code": 6124,
      "name": "InvalidMinStakeFloor",
      "msg": "Invalid minimum stake floor."
    },
    {
      "code": 6125,
      "name": "InvalidMinStakeCeiling",
      "msg": "Invalid minimum stake ceiling."
    },
    {
      "code": 6126,
      "name": "InvalidSweepThresholdFloor",
      "msg": "Invalid sweep threshold floor."
    },
    {
      "code": 6127,
      "name": "InvalidSweepThresholdCeiling",
      "msg": "Invalid sweep threshold ceiling."
    },
    {
      "code": 6128,
      "name": "InvalidFeeFloor",
      "msg": "Invalid fee floor."
    },
    {
      "code": 6129,
      "name": "StateAlreadySet",
      "msg": "State is already set."
    },
    {
      "code": 6130,
      "name": "AuthorityRevokeFailed",
      "msg": "Authority revocation failed."
    },
    {
      "code": 6131,
      "name": "InvalidWithdrawalLimitFloor",
      "msg": "Invalid withdrawal limit floor."
    },
    {
      "code": 6132,
      "name": "InvalidWithdrawalLimitCeiling",
      "msg": "Invalid withdrawal limit ceiling."
    },
    {
      "code": 6133,
      "name": "DuplicateAccountInBatch",
      "msg": "Duplicate account in batch."
    },
    {
      "code": 6134,
      "name": "InvalidAccountData",
      "msg": "Invalid account data."
    },
    {
      "code": 6135,
      "name": "ReentrancyGuardTriggered",
      "msg": "Reentrancy guard is locked."
    },
    {
      "code": 6136,
      "name": "TokensNotBurned",
      "msg": "Tokens were not burned."
    },
    {
      "code": 6137,
      "name": "InvalidPoolAccount",
      "msg": "Invalid pool account."
    },
    {
      "code": 6138,
      "name": "CollateralIsLocked",
      "msg": "Collateral is locked."
    },
    {
      "code": 6139,
      "name": "ResetCooldownNotExpired",
      "msg": "Reset cooldown has not expired yet."
    },
    {
      "code": 6140,
      "name": "LimitAlreadyZero",
      "msg": "Limit is already zero."
    },
    {
      "code": 6141,
      "name": "RewardsAlreadyStopped",
      "msg": "Rewards have already been stopped."
    },
    {
      "code": 6142,
      "name": "AuthorityAlreadyRevoked",
      "msg": "Authority is already revoked"
    },
    {
      "code": 6143,
      "name": "InvalidSigner",
      "msg": "Invalid signer provided"
    },
    {
      "code": 6144,
      "name": "AlreadyRevoked",
      "msg": "Already revoked"
    },
    {
      "code": 6145,
      "name": "AlreadyClosed",
      "msg": "Already closed"
    },
    {
      "code": 6146,
      "name": "InvalidMultiplier",
      "msg": "Invalid multiplier"
    },
    {
      "code": 6147,
      "name": "InitializationFailed",
      "msg": "Initialization failed"
    },
    {
      "code": 6148,
      "name": "AccountFrozen",
      "msg": "Account is currently frozen"
    },
    {
      "code": 6149,
      "name": "StalePrice",
      "msg": "Stale price"
    },
    {
      "code": 6150,
      "name": "OracleConfidenceIntervalTooHigh",
      "msg": "Oracle confidence interval too high"
    },
    {
      "code": 6151,
      "name": "TimelockNotExpired",
      "msg": "Timelock not expired"
    },
    {
      "code": 6152,
      "name": "PriceVolatilityTooHigh",
      "msg": "Price volatility too high"
    },
    {
      "code": 6153,
      "name": "PositionUnderwater",
      "msg": "Position underwater"
    },
    {
      "code": 6154,
      "name": "InvalidPoolVersion",
      "msg": "Invalid pool version"
    },
    {
      "code": 6155,
      "name": "PoolPaused",
      "msg": "Pool is paused"
    },
    {
      "code": 6156,
      "name": "OracleError",
      "msg": "Oracle error"
    },
    {
      "code": 6157,
      "name": "InvalidDecimals",
      "msg": "Invalid decimals"
    },
    {
      "code": 6158,
      "name": "MarketVolatilityTooHigh",
      "msg": "Market volatility too high"
    },
    {
      "code": 6159,
      "name": "SlippageToleranceExceeded",
      "msg": "Slippage tolerance exceeded"
    },
    {
      "code": 6160,
      "name": "CriticalStateMismatch",
      "msg": "Critical state mismatch"
    },
    {
      "code": 6161,
      "name": "InvalidPrice",
      "msg": "Invalid price from oracle"
    }
  ],
  "types": [
    {
      "name": "BlacklistAction",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "RequestFreeze"
          },
          {
            "name": "FinalizeFreeze"
          },
          {
            "name": "RequestUnblock"
          },
          {
            "name": "FinalizeUnblock"
          }
        ]
      }
    },
    {
      "name": "ClaimEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "CollateralUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "new_amount",
            "type": "u64"
          },
          {
            "name": "dao_fee",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "InitializePoolConfigArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool_bump",
            "type": "u8"
          },
          {
            "name": "max_dao_withdrawal_amount",
            "type": "u64"
          },
          {
            "name": "admin_fee_share_bps",
            "type": "u16"
          },
          {
            "name": "early_exit_fee_bps",
            "type": "u16"
          },
          {
            "name": "lockup_seconds",
            "type": {
              "array": [
                "i64",
                5
              ]
            }
          },
          {
            "name": "tier_multipliers",
            "type": {
              "array": [
                "u16",
                5
              ]
            }
          },
          {
            "name": "sweep_threshold",
            "type": "u64"
          },
          {
            "name": "gov_lock",
            "type": "i64"
          },
          {
            "name": "lending_grace",
            "type": "i64"
          },
          {
            "name": "active_pools_count",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "PoolState",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "reward_per_share_global",
            "type": "u128"
          },
          {
            "name": "reward_rate_per_sec",
            "type": "u128"
          },
          {
            "name": "pending_reward_rate",
            "type": "u128"
          },
          {
            "name": "cumulative_borrow_index",
            "type": "u128"
          },
          {
            "name": "governance_authority",
            "type": "pubkey"
          },
          {
            "name": "admin_authority",
            "type": "pubkey"
          },
          {
            "name": "lending_authority",
            "type": "pubkey"
          },
          {
            "name": "pending_governance_authority",
            "type": "pubkey"
          },
          {
            "name": "reward_mint",
            "type": "pubkey"
          },
          {
            "name": "st_mint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "admin_fee_vault",
            "type": "pubkey"
          },
          {
            "name": "dao_treasury_vault",
            "type": "pubkey"
          },
          {
            "name": "defaulter_treasury_vault",
            "type": "pubkey"
          },
          {
            "name": "pending_blacklist_user",
            "type": "pubkey"
          },
          {
            "name": "min_initial_stake",
            "type": "u64"
          },
          {
            "name": "pending_change_time",
            "type": "i64"
          },
          {
            "name": "last_reward_time",
            "type": "i64"
          },
          {
            "name": "max_dao_withdrawal_amount",
            "type": "u64"
          },
          {
            "name": "sweep_threshold",
            "type": "u64"
          },
          {
            "name": "total_staked_amount",
            "type": "u64"
          },
          {
            "name": "total_weighted_stake",
            "type": "u64"
          },
          {
            "name": "total_unclaimed_rewards",
            "type": "u64"
          },
          {
            "name": "dao_withdrawal_24h_cap",
            "type": "u64"
          },
          {
            "name": "dao_withdrawal_reset_time",
            "type": "i64"
          },
          {
            "name": "governance_lock_seconds",
            "type": "i64"
          },
          {
            "name": "lending_unlock_grace_seconds",
            "type": "i64"
          },
          {
            "name": "pending_config_activation_time",
            "type": "i64"
          },
          {
            "name": "blacklist_unlock_time",
            "type": "i64"
          },
          {
            "name": "pools_update_time",
            "type": "i64"
          },
          {
            "name": "pending_index_reset_time",
            "type": "i64"
          },
          {
            "name": "version",
            "type": "u64"
          },
          {
            "name": "total_reserves",
            "type": "u64"
          },
          {
            "name": "ltv_basis_points",
            "type": "u64"
          },
          {
            "name": "liquidation_threshold_bps",
            "type": "u64"
          },
          {
            "name": "max_immediate_change_limit",
            "type": "u64"
          },
          {
            "name": "timelock_delay",
            "type": "u64"
          },
          {
            "name": "last_seen_price",
            "type": "u64"
          },
          {
            "name": "pending_dao_fees",
            "type": "u64"
          },
          {
            "name": "reserve_factor",
            "type": "u64"
          },
          {
            "name": "lockup_seconds",
            "type": {
              "array": [
                "i64",
                5
              ]
            }
          },
          {
            "name": "tier_multipliers_bps",
            "type": {
              "array": [
                "u16",
                5
              ]
            }
          },
          {
            "name": "pending_config_tier_multipliers",
            "type": {
              "array": [
                "u16",
                5
              ]
            }
          },
          {
            "name": "admin_fee_share_bps",
            "type": "u16"
          },
          {
            "name": "early_exit_fee_bps",
            "type": "u16"
          },
          {
            "name": "pending_config_early_exit_bps",
            "type": "u16"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "active_pools_count",
            "type": "u8"
          },
          {
            "name": "is_initialized",
            "type": "u8"
          },
          {
            "name": "global_pause",
            "type": "u8"
          },
          {
            "name": "pool_bump",
            "type": "u8"
          },
          {
            "name": "st_mint_bump",
            "type": "u8"
          },
          {
            "name": "vault_bump",
            "type": "u8"
          },
          {
            "name": "admin_fee_vault_bump",
            "type": "u8"
          },
          {
            "name": "dao_treasury_vault_bump",
            "type": "u8"
          },
          {
            "name": "defaulter_treasury_vault_bump",
            "type": "u8"
          },
          {
            "name": "pending_active_pools_count",
            "type": "u8"
          },
          {
            "name": "_pad_to_align",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "manual_padding",
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      "name": "StakeEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "pool_index",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "UserStakingAccount",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "reward_per_share_user",
            "type": "u128"
          },
          {
            "name": "last_borrow_index",
            "type": "u128"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "pool_state",
            "type": "pubkey"
          },
          {
            "name": "staked_amount",
            "type": "u64"
          },
          {
            "name": "lockup_end_time",
            "type": "i64"
          },
          {
            "name": "rewards_to_claim",
            "type": "u64"
          },
          {
            "name": "pending_rewards_due_to_limit",
            "type": "u64"
          },
          {
            "name": "lending",
            "type": "u64"
          },
          {
            "name": "lending_unlock_time",
            "type": "i64"
          },
          {
            "name": "last_update_time",
            "type": "i64"
          },
          {
            "name": "st_tokens_minted",
            "type": "u64"
          },
          {
            "name": "last_deposit_slot",
            "type": "u64"
          },
          {
            "name": "blacklist_activation_time",
            "type": "i64"
          },
          {
            "name": "tier_multiplier",
            "type": "u16"
          },
          {
            "name": "pool_index",
            "type": "u8"
          },
          {
            "name": "is_initialized",
            "type": "u8"
          },
          {
            "name": "is_blacklisted",
            "type": "u8"
          },
          {
            "name": "blacklist_pending_status",
            "type": "u8"
          },
          {
            "name": "stake_bump",
            "type": "u8"
          },
          {
            "name": "reserved_padding",
            "type": "u8"
          },
          {
            "name": "_final_fix",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "CURRENT_VERSION",
      "type": "u64",
      "value": "1"
    }
  ]
}
