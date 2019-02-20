function getUrlVars() {
  var vars = [], hash;
  var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
  for (var i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    vars.push(hash[0]);
    vars[hash[0]] = hash[1];
  }
  return vars;
}

const CHAINX_BTC = getUrlVars().btc || '2N8tR484JD32i1DY2FnRPLwBVaNuXSfzoAv';//'3K1oFZMks41C7qDYBsr72SYjapLqDuSYuN';
const INIT_CHAINX_ADDR = getUrlVars().chainx;
if (INIT_CHAINX_ADDR) {
  $('#chainxaddress').val(INIT_CHAINX_ADDR);
  bulilChainxVerify();
}

var {
  toBitcoinTestAdress,
} = require('bitcoin-util');

function toBalance(value) {
  return (value / 100000000).toFixed(8) * 1;
}

function loadAccountInfo() {
  //var words = 'nasty transfer hair service rebuild region sail novel tower margin puppy fork';
  //$('#mnemonic').val(words);
  //通过助记词得到账户地址
  var words = $('#mnemonic').val().trim();
  if (!words || words.length < 1) {
    alert('请输入BTC账户助记词!');
    return;
  }
  var address = toBitcoinTestAdress(words).address;
  console.log('助记词:' + words);
  console.log('用户BTC地址:' + address);
  //查询账户余额
  coinjs.addressBalance(address, function (data) {
    try {
      console.log(data);

      if (data.final_balance) {
        console.log('账户余额:' + data.final_balance);
        $('#btcaddress').val(address + ' (余额:' + toBalance(data.final_balance) +
          ')')
      } else {
        console.log("查询账户余额失败");
      }
    } catch (e) {
      console.log("返回数据异常" + e);
    }

  });
}

$('#mnemonic').change(() => {
  loadAccountInfo();
  $('#sendtransaction').prop('disabled', '');
});

function bulilChainxVerify() {
  //var address='5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDtZ';
  var address = $('#chainxaddress').val().trim();
  var btcopreturn = address;
  console.log('ChainX地址:' + address);
  console.log('OP_RETURN:' + btcopreturn);
  if (btcopreturn.length < 3) {
    alert('格式错误，请重新输入！')
  } else {
    $('#btcopreturn').val(btcopreturn);
  }
}

$('#chainxaddress').change(() => {
  bulilChainxVerify()
  $('#sendtransaction').prop('disabled', '');
});

function buildTxAndBroadcast() {
  var deposit = 0;
  var fee = 0.0001;
  var total = (deposit * 1) + (fee * 1);
  var opreturn = $('#btcopreturn').val().trim();

  if (deposit * 1 < 0) {
    console.log('充值金额错误，请重新输入！');
    return;
  }
  if (fee * 1 < 0) {
    console.log('手续费错误，请重新输入！');
    return;
  }
  if (opreturn.length < 1) {
    console.log('OP_RETURN 数据错误！');
    return;
  }

  console.log('跨链接收地址:' + CHAINX_BTC);
  console.log('OP_RETURN:' + opreturn);
  console.log('充值金额:' + deposit);
  console.log('手续费:' + fee);
  console.log('总共支付:' + total);

  //注意 当前不支持 Segwit
  var btcaccount = toBitcoinTestAdress($('#mnemonic').val().trim());
  var address = btcaccount.address;
  var tx = coinjs.transaction();
  var script = false;
  var sequence = false;
  var estimatedTxSize = 10; // <4:version><1:txInCount><1:txOutCount><4:nLockTime>

  // 第一个output 支付给跨链地址
  var ad = coinjs.addressDecode(CHAINX_BTC);
  if (((ad.version == coinjs.pub ||
      ad.version == coinjs.multisig || ad.version == coinjs.test_multisig ||
      ad.type == "bech32") ||
    ad.type == 'test' || ad.type == 'test_multisig'
  )) { // address
    // P2SH output is 32, P2PKH is 34
    estimatedTxSize += (ad.version == coinjs.pub ? 34 : 32)
    tx.addoutput(CHAINX_BTC, deposit * 1);  //支付给跨链地址
  } else if ((ad.version === 42)) { // stealth address
    // 1 P2PKH and 1 OP_RETURN with 36 bytes, OP byte, and 8 byte value
    estimatedTxSize += 78
    tx.addstealth(ad, deposit * 1);
  }
  // 添加op_return
  estimatedTxSize += (opreturn.length / 2) + 1 + 8

  tx.adddataofstring(opreturn);

  console.log('支付源地址:' + address);

  tx.addUnspent(address, total * 100000000, function (data) {
    console.log('unspend:' + JSON.stringify(data));
    if (!data.value) {
      console.log("添加unspend 出现异常!");
      return;
    }
    var dvalue = (data.value / 100000000).toFixed(8) * 1;
    total = (total * 1).toFixed(8) * 1;

    if (dvalue < total) {
      alert('账户余额不足!');
      return
    }

    var change = dvalue - total;
    if ((change * 1) > 0) {
      // 第二个output 支付给找零
      var ad = coinjs.addressDecode(address);
      if (((ad.version == coinjs.pub || ad.version == coinjs.multisig || ad.type == "bech32") || ad.type == 'test')) { // address
        // P2SH output is 32, P2PKH is 34
        estimatedTxSize += (ad.version == coinjs.pub ? 34 : 32)
        tx.addoutput(address, change * 1);  //支付给跨链地址
      } else if ((ad.version === 42)) { // stealth address
        // 1 P2PKH and 1 OP_RETURN with 36 bytes, OP byte, and 8 byte value
        estimatedTxSize += 78
        tx.addstealth(ad, change * 1);
      }
    }

    var signed = tx.sign(btcaccount.wif);

    console.log('签名交易:' + signed);
    $('.txSize').html(signed.length / 2);
    $('#message').html('签名交易已被生成，点击下方按钮 ’提交交易‘ 即可广播交易！');

    tx.broadcast(function (data) {
      console.log('广播交易:' + JSON.stringify(data));
      if (data.tx && data.tx.hash) {
        $('#message').html('交易广播成功！txHash:<a href="https://live.blockcypher.com/btc-testnet/tx/' + data.tx.hash + '" target="_blank">' + data.tx.hash + '</a>');
      } else {
        alert('广播交易异常!' + JSON.stringify(data));
      }
      $('#sendtransaction').prop('disabled', 'disabled')
    }, signed);
  }, script, script, sequence);

  return tx;
}

$('#sendtransaction').click(() => {
  console.log('hello world');
  buildTxAndBroadcast();
});
