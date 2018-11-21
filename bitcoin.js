const bip39 = require('bip39');
const bitcoin = require('bitcoinjs-lib');//version=3.3.2
var {bytesToHex,ss58Decode,hexToBytes} = require('oo7-substrate');
const bip32 = require('bip32');

// import using testnet 3 network
var pushtx = require('blockchain.info').pushtx.usingNetwork(3)
var blockexplorer=require('blockchain.info').blockexplorer.usingNetwork(3)

function toChainxPubkey(address){
    var account_58 = address;//'5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDtZ';
    var account_u8 = ss58Decode(account_58); //58地址=》u8
    return  bytesToHex(account_u8); //公钥
}

function toBitcoinTestAdress(words){
    let seedBuffer = bip39.mnemonicToSeed(words);
    let seedHex = seedBuffer.toString('hex');
    //console.log('seed='+seedHex);

    let root = bitcoin.HDNode.fromSeedHex(seedHex,bitcoin.networks.testnet);
    //console.log('xprv: ' + root.toBase58()); 
    //console.log('xpub: ' + root.neutered().toBase58()); 

    //生成派生key:
    let child0 = root.derivePath("m/44'/1'/0'/0/0");

    //console.log("prv m/44'/1'/0'/0/0: " + child0.keyPair.toWIF()); // KzuPk3PXKdnd6QwLqUCK38PrXoqJfJmACzxTaa6TFKzPJR7H7AFg
    //console.log("pub m/44'/1'/0'/0/0: " + child0.getAddress()); // 

    return {address:child0.getAddress(),wif:child0.keyPair.toWIF()};
}
function fromPrivateKeyToTestAddress(pri){
    let root = bitcoin.HDNode.fromBase58(pri,bitcoin.networks.testnet);
    //console.log('xprv: ' + root.toBase58()); 
    //console.log('xpub: ' + root.neutered().toBase58()); 

    //生成派生key:
    let child0 = root.derivePath("m/44'/1'/0'/0/0");

    //console.log("prv m/44'/1'/0'/0/0: " + child0.keyPair.toWIF()); // KzuPk3PXKdnd6QwLqUCK38PrXoqJfJmACzxTaa6TFKzPJR7H7AFg
    //console.log("pub m/44'/1'/0'/0/0: " + child0.getAddress()); // 

    return {address:child0.getAddress(),wif:child0.keyPair.toWIF()};
}

module.exports ={toBitcoinTestAdress,toChainxPubkey,fromPrivateKeyToTestAddress}

