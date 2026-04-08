# Makefile for P2P Energy Trading Platform
-include .env
-include .env.deployed

export
# ============================================
# NETWORK CONFIGURATION
# ============================================
ANVIL_RPC = http://localhost:8545
SEPOLIA_RPC = https://eth-sepolia.g.alchemy.com/v2/GQru2sfzazJ-VXmPKGH95

# Default to Anvil
NETWORK ?= anvil

# ============================================
# COLORS
# ============================================
GREEN = \033[0;32m
RED = \033[0;31m
YELLOW = \033[0;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

# ============================================
# HELPER FUNCTIONS
# ============================================
define get_rpc
$(if $(filter anvil,$(NETWORK)),$(ANVIL_RPC),$(SEPOLIA_RPC))
endef

define get_broadcast_flag
$(if $(filter anvil,$(NETWORK)),--broadcast,--broadcast --verify --etherscan-api-key $(ETHERSCAN_KEY))
endef

# ============================================
# BUILD & TEST (Works on any network)
# ============================================

build:
	@echo "$(GREEN)Building contracts...$(NC)"
	forge build

test:
	@echo "$(GREEN)Running tests...$(NC)"
	forge test -vvv

test-verbose:
	@echo "$(GREEN)Running tests with verbose output...$(NC)"
	forge test -vvvv

clean:
	@echo "$(GREEN)Cleaning build artifacts...$(NC)"
	forge clean
	rm -f .env.deployed
	rm -f .anvil.deployed
	rm -f .sepolia.deployed

# ============================================
# ANVIL (Local Development) COMMANDS
# ============================================

anvil-status:
	@echo "$(GREEN)Checking Anvil status...$(NC)"
	@cast chain-id --rpc-url $(ANVIL_RPC) 2>/dev/null && echo "$(GREEN)✓ Anvil is running at $(ANVIL_RPC)$(NC)" || echo "$(RED)✗ Anvil is not running. Start with: make anvil-start$(NC)"

anvil-start:
	@echo "$(GREEN)Starting Anvil...$(NC)"
	@echo "$(YELLOW)Note: Run this in a separate terminal$(NC)"
	anvil --host 0.0.0.0 --port 8545 --chain-id 31337 --gas-limit 30000000

anvil-deploy-token:
	@echo "$(GREEN)[Anvil] Deploying EnergyToken...$(NC)"
	NETWORK=anvil forge script script/DeployEnergyToken.s.sol --rpc-url $(ANVIL_RPC) --broadcast
	@echo "$(GREEN)✓ Token deployed$(NC)"

anvil-deploy-marketplace:
	@echo "$(GREEN)[Anvil] Deploying EnergyMarketplace...$(NC)"
	@# Read TOKEN_ADDRESS from .env.deployed
	$(eval TOKEN_ADDRESS := $(shell grep TOKEN_ADDRESS .env.deployed | cut -d '=' -f2))
	@if [ -z "$(TOKEN_ADDRESS)" ]; then \
		echo "$(RED)TOKEN_ADDRESS not found in .env.deployed$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Using TOKEN_ADDRESS: $(TOKEN_ADDRESS)$(NC)"
	@TOKEN_ADDRESS=$(TOKEN_ADDRESS) NETWORK=anvil forge script script/DeployEnergyMarketplace.s.sol --rpc-url $(ANVIL_RPC) --broadcast
	@echo "$(GREEN)✓ Marketplace deployed$(NC)"

anvil-deploy-tokensale:
	@echo "$(GREEN)[Anvil] Deploying EnergyTokenSale...$(NC)"
	@# Read TOKEN_ADDRESS from .env.deployed
	$(eval TOKEN_ADDRESS := $(shell grep TOKEN_ADDRESS .env.deployed | cut -d '=' -f2))
	@if [ -z "$(TOKEN_ADDRESS)" ]; then \
		echo "$(RED)TOKEN_ADDRESS not found in .env.deployed$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Using TOKEN_ADDRESS: $(TOKEN_ADDRESS)$(NC)"
	@TOKEN_ADDRESS=$(TOKEN_ADDRESS) NETWORK=anvil forge script script/DeployEnergyTokenSale.s.sol --rpc-url $(ANVIL_RPC) --broadcast
	@echo "$(GREEN)✓ TokenSale deployed$(NC)"


anvil-setup:
	@echo "$(GREEN)[Anvil] Running SetupContracts.s.sol...$(NC)"
	@forge script script/SetupContracts.s.sol --rpc-url $(ANVIL_RPC) --broadcast
	@echo "$(GREEN)✓ Setup complete$(NC)"

anvil-transfer-tokens:
	@echo "$(GREEN)[Anvil] Transferring tokens to treasury...$(NC)"
	@cast send $(TOKEN_ADDRESS) "transfer(address,uint256)" $(TREASURY_ADDRESS) 5000000000000000000000000 --rpc-url $(ANVIL_RPC) --private-key $(PRIVATE_KEY)
	@echo "$(GREEN)✓ Tokens transferred$(NC)"

anvil-set-price:
	@echo "$(GREEN)[Anvil] Setting token price...$(NC)"
	@source .env.anvil 2>/dev/null || (echo "$(RED)No .env.anvil found$(NC)" && exit 1); \
	cast send $$TOKENSALE_ADDRESS "setTokenPrice(uint256)" 1000000000000000 --rpc-url $(ANVIL_RPC) --private-key $$PRIVATE_KEY
	@echo "$(GREEN)✓ Token price set to 0.001 ETH per token$(NC)"

anvil-set-fees:
	@echo "$(GREEN)[Anvil] Setting marketplace fees...$(NC)"
	@source .env.anvil 2>/dev/null || (echo "$(RED)No .env.anvil found$(NC)" && exit 1); \
	cast send $$MARKETPLACE_ADDRESS "updateFeeConfig(uint256,uint256,uint256)" 100 10000000000000000000 1000000000000000000000 --rpc-url $(ANVIL_RPC) --private-key $$PRIVATE_KEY
	@echo "$(GREEN)✓ Fees configured (1%, min 10 tokens, max 1000 tokens)$(NC)"

anvil-approve-tokensale:
	@echo "$(GREEN)[Anvil] Running ApproveTokenSale script...$(NC)"
	@forge script script/ApproveTokenSale.s.sol --rpc-url $(ANVIL_RPC) --broadcast
	@echo "$(GREEN)✓ TokenSale approved via Solidity script$(NC)"

anvil-deploy-all:
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)Deploying all contracts to Anvil...$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	$(MAKE) anvil-deploy-token
	$(MAKE) anvil-deploy-marketplace
	$(MAKE) anvil-deploy-tokensale
	$(MAKE) anvil-transfer-tokens
	$(MAKE) anvil-set-price
	$(MAKE) anvil-set-fees
	$(MAKE) anvil-approve-tokensale
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)✓ All contracts deployed and configured!$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@$(MAKE) anvil-show-addresses

anvil-show-addresses:
	@echo "$(BLUE)=== Deployed Addresses (Anvil) ===$(NC)"
	@if [ -f .env.anvil ]; then cat .env.anvil; else echo "$(RED)No addresses found. Deploy first!$(NC)"; fi

anvil-test-buy:
	@echo "$(BLUE)========================================$(NC)"
	@echo "$(GREEN)[Anvil] INITIATING TOKEN PURCHASE TEST$(NC)"
	@echo "$(BLUE)========================================$(NC)"
	@VARS=$$($(FETCH_VARS)) && \
	echo "$(YELLOW)Processing 0.1 ETH purchase from User account...$(NC)" && \
	env $$VARS cast send $$TOKENSALE_ADDRESS "buyTokens()" --value 0.1ether --rpc-url $(ANVIL_RPC) --private-key $$USER_PRIVATE_KEY
	@echo "$(GREEN)✓ Purchase successful! User now holds ENERGY tokens.$(NC)"

anvil-check-balances:
	@echo "$(BLUE)════════════ CURRENT BALANCES ════════════$(NC)"
	@echo "$(YELLOW)Treasury ($(TREASURY_ADDRESS)):$(NC)"
	@cast call $(TOKEN_ADDRESS) "balanceOf(address)(uint256)" $(TREASURY_ADDRESS) --rpc-url $(ANVIL_RPC)
	@echo "$(YELLOW)User (Account #2):$(NC)"
	@cast call $(TOKEN_ADDRESS) "balanceOf(address)(uint256)" 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --rpc-url $(ANVIL_RPC)
	@echo "$(BLUE)══════════════════════════════════════════$(NC)"

anvil-test-register-producer:
	@echo "$(GREEN)[Anvil] Registering Test Producer...$(NC)"
	@VARS=$$($(FETCH_VARS)) && \
	echo "$(YELLOW)Registering 'Test Solar Farm' in Mumbai...$(NC)" && \
	env $$VARS cast send $$MARKETPLACE_ADDRESS "registerProducer(string,string,uint256,uint8)" \
		"Test Solar Farm" "Mumbai" 5000 0 "QmTestCID" \
		--rpc-url $(ANVIL_RPC) --private-key $$PRODUCER_PRIVATE_KEY
	@echo "$(GREEN)✓ Producer registered successfully$(NC)"

anvil-verify-producer:
	@echo "$(GREEN)[Anvil] Verifying Producer: $(PRODUCER_ADDRESS)...$(NC)"
	@# Ensure PRODUCER_ADDRESS is passed: make anvil-verify-producer PRODUCER_ADDRESS=0x...
	@if [ -z "$(PRODUCER_ADDRESS)" ]; then \
		echo "$(RED)Error: PRODUCER_ADDRESS is required.$(NC)"; \
		echo "$(YELLOW)Usage: make anvil-verify-producer PRODUCER_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8$(NC)"; \
		exit 1; \
	fi
	@VARS=$$($(FETCH_VARS)) && \
	env $$VARS cast send $(MARKETPLACE_ADDRESS) \
		"verifyProducer(address)" \
		$(PRODUCER_ADDRESS) \
		--rpc-url $(ANVIL_RPC) --private-key $(PRIVATE_KEY)
	@echo "$(GREEN)✓ Producer $(PRODUCER_ADDRESS) is now VERIFIED$(NC)"


anvil-test-create-listing:
	@echo "$(GREEN)[Anvil] Creating Energy Listing...$(NC)"
	@VARS=$$($(FETCH_VARS)) && \
	START_TIME=$$(($(shell date +%s) + 10)) && \
	END_TIME=$$(($$START_TIME + 604800)) && \
	echo "$(YELLOW)Creating listing for 1000 units at 10 tokens/unit...$(NC)" && \
	env $$VARS cast send $$MARKETPLACE_ADDRESS "createListing(uint256,uint256,uint256,uint256,uint256,uint256,string)" \
		1000 10 $$START_TIME $$END_TIME 10 500 "QmListingCID" \
		--rpc-url $(ANVIL_RPC) --private-key $$PRODUCER_PRIVATE_KEY
	@echo "$(GREEN)✓ Listing created successfully$(NC)"


anvil-purchase-energy:
	@echo "$(BLUE)========================================$(NC)"
	@echo "$(GREEN)[Anvil] Executing Energy Purchase$(NC)"
	@echo "$(BLUE)========================================$(NC)"
	@VARS=$$($(FETCH_VARS)) && \
	echo "$(YELLOW)Step 1: User approving Marketplace to spend tokens...$(NC)" && \
	env $$VARS cast send $$TOKEN_ADDRESS "approve(address,uint256)" $$MARKETPLACE_ADDRESS 1000000000000000000000 --rpc-url $(ANVIL_RPC) --private-key $$USER_PRIVATE_KEY && \
	echo "$(GREEN)✓ Approval granted$(NC)" && \
	echo "$(YELLOW)Step 2: Purchasing 5 units from Listing #1...$(NC)" && \
	env $$VARS cast send $(MARKETPLACE_ADDRESS) "purchaseEnergy(uint256,uint256)" 2 10 --rpc-url $(ANVIL_RPC) --private-key $$USER_PRIVATE_KEY
	@echo "$(GREEN)✓ Transaction Successful! 5 units purchased.$(NC)"

anvil-test-all:
	@echo "$(GREEN)Running all tests on Anvil...$(NC)"
	$(MAKE) anvil-test-buy
	$(MAKE) anvil-test-register-producer
	$(MAKE) anvil-test-create-listing
	@echo "$(GREEN)✓ All tests completed$(NC)"

anvil-reset:
	@echo "$(RED)Resetting Anvil deployment...$(NC)"
	rm -f .env.anvil
	@echo "$(GREEN)✓ Reset complete. You can now redeploy.$(NC)"

# ============================================
# SEPOLIA (Testnet) COMMANDS
# ============================================

sepolia-check-balance:
	@echo "$(BLUE)══════════════════════════════════════════$(NC)"
	@echo "$(GREEN)[Sepolia] Checking Wallet Balance...$(NC)"
	@echo "$(BLUE)══════════════════════════════════════════$(NC)"
	@cast balance $(SEPOLIA_TREASURY_ADDRESS) --rpc-url $(SEPOLIA_RPC) --ether
	@echo "$(YELLOW)Make sure you have at least 0.2 ETH for full deployment.$(NC)"

sepolia-deploy-token:
	@echo "$(BLUE)========================================$(NC)"
	@echo "$(GREEN)🚀 [Sepolia] Deploying EnergyToken$(NC)"
	@echo "$(BLUE)========================================$(NC)"
	@VARS=$$($(FETCH_VARS)) && \
	env $$VARS forge script script/DeployEnergyToken.s.sol \
		--rpc-url $(SEPOLIA_RPC) \
		--broadcast \
		--chain-id 11155111 \
		--slow \
		-vvvv
	@echo "$(GREEN)✅ [Sepolia] Deployment completed successfully!$(NC)"
sepolia-deploy-marketplace:
	@echo "$(GREEN)🚀 [Sepolia] Deploying EnergyMarketplace...$(NC)"
	@echo "$(YELLOW)Linking to Token at: $(TOKEN_ADDRESS)$(NC)"
	@TOKEN_ADDRESS=$(TOKEN_ADDRESS) NETWORK=sepolia forge script script/DeployEnergyMarketplace.s.sol --rpc-url $(SEPOLIA_RPC) --broadcast -vvvv
	@echo "$(GREEN)✓ Marketplace deployed and verified!$(NC)"

sepolia-deploy-tokensale:
	@echo "$(GREEN)🚀 [Sepolia] Deploying EnergyTokenSale...$(NC)"
	@TOKEN_ADDRESS=$(TOKEN_ADDRESS) NETWORK=sepolia forge script script/DeployEnergyTokenSale.s.sol --rpc-url $(SEPOLIA_RPC) --broadcast -vvvv
	@echo "$(GREEN)✓ TokenSale deployed to Sepolia$(NC)"


sepolia-setup:
	@echo "$(BLUE)⚙️  [Sepolia] Running SetupContracts.s.sol...$(NC)"
	@NETWORK=sepolia forge script script/SetupContracts.s.sol --rpc-url $(SEPOLIA_RPC) --broadcast --slow -vvvvv
	@echo "$(GREEN)✓ Roles and Fee configurations updated on-chain.$(NC)"

sepolia-approve-tokensale:
	@echo "$(BLUE)========================================$(NC)"
	@echo "$(BLUE)🔑 [Sepolia] Authorizing TokenSale to spend Treasury tokens...$(NC)"
	@echo "$(BLUE)========================================$(NC)"
	@VARS=$$($(FETCH_VARS)) && \
	env $$VARS forge script script/ApproveTokenSale.s.sol \
		--rpc-url $(SEPOLIA_RPC) \
		--broadcast \
		--slow \
		-vvvv
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)✅ Treasury approval confirmed via Solidity script.$(NC)"



sepolia-test-buy:
	@echo "$(BLUE)========================================$(NC)"
	@echo "$(GREEN)[Sepolia] INITIATING REAL TOKEN PURCHASE$(NC)"
	@echo "$(BLUE)========================================$(NC)"
	@VARS=$$($(FETCH_VARS)) && \
	echo "$(YELLOW)Sending 0.01 ETH to TokenSale contract...$(NC)" && \
	env $$VARS cast send $$TOKENSALE_ADDRESS "buyTokens()" --value 0.01ether --rpc-url $(SEPOLIA_RPC) --private-key $$USER_PRIVATE_KEY
	@echo "$(GREEN)✅ Purchase confirmed on Sepolia! Check your wallet.$(NC)"




sepolia-transfer-tokens:
	@echo "$(GREEN)[Sepolia] Transferring tokens to treasury...$(NC)"
	@source .env.sepolia 2>/dev/null || (echo "$(RED)No .env.sepolia found$(NC)" && exit 1); \
	cast send $$TOKEN_ADDRESS "transfer(address,uint256)" $$TREASURY_ADDRESS 5000000000000000000000000 --rpc-url $(SEPOLIA_RPC) --private-key $$PRIVATE_KEY
	@echo "$(GREEN)✓ Tokens transferred$(NC)"

sepolia-set-price:
	@echo "$(GREEN)[Sepolia] Setting token price...$(NC)"
	@source .env.sepolia 2>/dev/null || (echo "$(RED)No .env.sepolia found$(NC)" && exit 1); \
	cast send $$TOKENSALE_ADDRESS "setTokenPrice(uint256)" 1000000000000000 --rpc-url $(SEPOLIA_RPC) --private-key $$PRIVATE_KEY
	@echo "$(GREEN)✓ Token price set to 0.001 ETH per token$(NC)"

sepolia-set-fees:
	@echo "$(GREEN)[Sepolia] Setting marketplace fees...$(NC)"
	@source .env.sepolia 2>/dev/null || (echo "$(RED)No .env.sepolia found$(NC)" && exit 1); \
	cast send $$MARKETPLACE_ADDRESS "updateFeeConfig(uint256,uint256,uint256)" 100 10000000000000000000 1000000000000000000000 --rpc-url $(SEPOLIA_RPC) --private-key $$PRIVATE_KEY
	@echo "$(GREEN)✓ Fees configured$(NC)"



sepolia-deploy-all:
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)Deploying all contracts to Sepolia...$(NC)"
	@echo "$(RED)⚠️  This will cost real gas!$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	$(MAKE) sepolia-deploy-token
	$(MAKE) sepolia-deploy-marketplace
	$(MAKE) sepolia-deploy-tokensale
	$(MAKE) sepolia-transfer-tokens
	$(MAKE) sepolia-set-price
	$(MAKE) sepolia-set-fees
	$(MAKE) sepolia-approve-tokensale
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)✓ All contracts deployed to Sepolia!$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@$(MAKE) sepolia-show-addresses



# ============================================
# HELPER & UTILITY COMMANDS
# ============================================

copy-anvil-to-sepolia:
	@echo "$(YELLOW)Copying Anvil config to Sepolia...$(NC)"
	@cp .env.anvil .env.sepolia
	@echo "$(GREEN)✓ Config copied. Update values for Sepolia!$(NC)"

help:
	@echo "$(GREEN)P2P Energy Trading Platform - Deployment Commands$(NC)"
	@echo ""
	@echo "$(BLUE)════════════════════════════════════════════════════════$(NC)"
	@echo "$(YELLOW)ANVIL (Local Development) - Test First!$(NC)"
	@echo "$(BLUE)════════════════════════════════════════════════════════$(NC)"
	@echo "  make anvil-status              - Check if Anvil is running"
	@echo "  make anvil-start               - Start Anvil node (in separate terminal)"
	@echo "  make anvil-deploy-all          - Deploy everything to Anvil"
	@echo "  make anvil-test-buy            - Test buying tokens"
	@echo "  make anvil-test-register-producer - Test producer registration"
	@echo "  make anvil-test-all            - Run all tests"
	@echo "  make anvil-show-addresses      - Show deployed addresses"
	@echo "  make anvil-reset               - Reset Anvil deployment"
	@echo ""
	@echo "$(BLUE)════════════════════════════════════════════════════════$(NC)"
	@echo "$(YELLOW)SEPOLIA (Testnet) - After Anvil tests pass$(NC)"
	@echo "$(BLUE)════════════════════════════════════════════════════════$(NC)"
	@echo "  make sepolia-check-balance     - Check wallet balance"
	@echo "  make sepolia-deploy-all        - Deploy everything to Sepolia"
	@echo "  make sepolia-show-addresses    - Show Sepolia addresses"
	@echo ""
	@echo "$(BLUE)════════════════════════════════════════════════════════$(NC)"
	@echo "$(YELLOW)UTILITY$(NC)"
	@echo "$(BLUE)════════════════════════════════════════════════════════$(NC)"
	@echo "  make build                     - Build contracts"
	@echo "  make test                      - Run tests"
	@echo "  make clean                     - Clean build artifacts"
	@echo "  make help                      - Show this help"
	@echo ""

.PHONY: build test clean anvil-status anvil-start anvil-deploy-token anvil-deploy-marketplace anvil-deploy-tokensale anvil-transfer-tokens anvil-set-price anvil-set-fees anvil-approve-tokensale anvil-deploy-all anvil-show-addresses anvil-test-buy anvil-test-register-producer anvil-test-create-listing anvil-test-all anvil-reset sepolia-check-balance sepolia-deploy-token sepolia-deploy-marketplace sepolia-deploy-tokensale sepolia-transfer-tokens sepolia-set-price sepolia-set-fees sepolia-approve-tokensale sepolia-deploy-all sepolia-show-addresses copy-anvil-to-sepolia help