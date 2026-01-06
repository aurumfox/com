use anchor_lang::prelude::*;

declare_id!("ZiECmSCWiJvsKRbNmBw27pyWEqEPFY4sBZ3MCnbvirH");

#[program]
pub mod my_first_deployment {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
