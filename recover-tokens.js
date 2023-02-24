const ethers = require('ethers');
const BigNumber = require('bignumber.js');
const { FlashbotsBundleProvider } = require("@flashbots/ethers-provider-bundle");

const erc20ABI = [{
    "constant": false,
    "inputs": [{
      "name": "_to",
      "type": "address"
    }, {
      "name": "_value",
      "type": "uint256"
    }],
    "name": "transfer",
    "outputs": [{
      "name": "",
      "type": "bool"
    }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }];

async function main() {
    const provider = new ethers.getDefaultProvider("https://rpc.ankr.com/eth_goerli	");

    const authSigner = new ethers.Wallet(
    '0x2000000000000000000000000000000000000000000000000000000000000000',
    provider
    );
    
    const flashbotsProvider = await FlashbotsBundleProvider.create(
    provider,
    authSigner,
    "https://relay-goerli.flashbots.net",
    "goerli"
    );

    await simulateTransaction(flashbotsProvider, provider);
}


async function simulateTransaction(flashbotsProvider, provider) {
    // Wallet1 Public Address: 0x7F445F4cf037747Bd675C7b1801dcF4c29Ef2E79
    const wallet1PublicAddress = "0x7F445F4cf037747Bd675C7b1801dcF4c29Ef2E79";
    const wallet1PrivateKey = "d3bf5d71f6324590c503e527967614a64e19138c5dc78cef80e8f84e3dd68b37";

    // Wallet 2 Public Address: 0x5C1567b5C5Ed0fb2EbeC2F6C82d33114FF6ACc4c
    const compromisedPrivateKey = "de1dc2b41a440f888daca5c109b64fd1caf5fd4c134b82e654e59820b36e4889";

    const wallet1 = new ethers.Wallet(wallet1PrivateKey);
    const compromisedWallet = new ethers.Wallet(compromisedPrivateKey);
    if(flashbotsProvider) {

        // token details
        const tokenAddress = '0xb5B640E6414b6DeF4FC9B3C1EeF373925effeCcF';
        const amount = 1000;
        const tokenDecimal = 6; // token decimal
        const base = new BigNumber(10);
        const valueToTransfer = base.pow(tokenDecimal)
        .times(amount);

        const iface = new ethers.utils.Interface(erc20ABI);
        const rawData = iface.encodeFunctionData("transfer", [wallet1PublicAddress, valueToTransfer.toString()]);

        const valueToTransferToComporomisedAccount = new BigNumber(100000000000000000);
        const signedTransactions = await flashbotsProvider.signBundle([
            {
            signer: wallet1,
            transaction: {
                to: "0x5C1567b5C5Ed0fb2EbeC2F6C82d33114FF6ACc4c",
                gasPrice: 15000000000,
                gasLimit: 21000,
                chainId: 5,
                value: "0x13FBE85EDC90000",
            },
            },
            // we need this second tx because flashbots only accept bundles that use at least 42000 gas.
            {
            signer: compromisedWallet,
            transaction: {
                to: tokenAddress,
                gasPrice: 15000000000,
                gasLimit: 250000,
                chainId: 5,
                value: 0,
                data: rawData
            },
            },
        ]);

    
        const blockNumber = await provider.getBlockNumber();
    
        console.log(new Date());
        const simulation = await flashbotsProvider.simulate(
            signedTransactions,
            blockNumber + 1
        );
        console.log(new Date());
    
        // Using TypeScript discrimination
        if ("error" in simulation) {
            console.log(`Simulation Error: ${simulation.error.message}`);
        } else {
            console.log(
            `Simulation Success: ${blockNumber} ${JSON.stringify(
                simulation,
                null,
                2
            )}`
            );
        }
        console.log(signedTransactions);
    
        sendTransactions({signedTransactions, blockNumber, flashbotsProvider});
    } else {
        console.log("Flashbot provider is not defined");
    }
}

async function sendTransactions(params) {
    if(params) {
        if(params.signedTransactions && params.blockNumber && params.flashbotsProvider) {
            for (var i = 1; i <= 10; i++) {
                const bundleSubmission = params.flashbotsProvider.sendRawBundle(
                params.signedTransactions,
                params.blockNumber + i
                );
                console.log("submitted for block # ", params.blockNumber + i);
                console.log(bundleSubmission);
            }
            console.log("bundles submitted");
        } else {
            console.log("signedTransactions or blockNumber or flashbotsProvider object is missing from param object");
        }
    }
}

main();