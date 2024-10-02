function doGet() {//サイトが開かれた際にindex.htmlをテンプレート化し、それを評価する
  var template = HtmlService.createTemplateFromFile('index');
  return template.evaluate();
}

function appendToSheet(data) {//受け取った入力をスプレッドシートに書き込む関数「入力された時間、商品名、支払い方法、個数」を書き込む
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('シート1'); //シート名を指定

  //現在使用されている一番下の行の、一個下の行に記録する
  const lastRow = sheet.getRange('A:A').getValues().filter(String).length;
  const nextRow = lastRow + 1; // 次の行を指定

  sheet.getRange(nextRow, 1, data.length, data[0].length).setValues(data);
}


const title = [//シート2の見出し
  '商品名', '支払い方法', '個数', '金額', ' '
];

const data_payment_method = [//シート2に記録する際に支払い方法ごとにどの行に書くかを決めておく
  { name: '現金支払い', line: 2 },
  { name: '金券支払い', line: 3 },
  { name: 'aupay支払い', line: 4 }
];

function GetSumCnt(data) {//集計する。dataには商品名や金額が書かれているのでこれを利用する。シート2に書き込むときの商品ごとの列番号の設定もdataに記録する

  // スプレッドシートとシートを取得 2種類もっておく。シート1には個別の会計記録、シート2には全体での売り上げの集計結果を記録する
  const sheet1 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('シート1');
  const sheet2 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('シート2');
  sheet2.clear();//シート2の内容を全てリセットする

  let now = 1;//今見てるのが何番目の商品なのかをもっておく
  data.forEach(function(item){
    item.position = now*5;//シート2において各商品を記録する領域を5列ごとに割り振る、その商品の一番右の列番号を記録する
    now++;
  });

  for (let i = 1; i <= now*5 - 5; i++) {//見出しを一番上の行にそれぞれ書いておく。nowは一個分過剰なので-5する
    sheet2.getRange(1, i).setValue(title[(i - 1) % 5]);//iが1からなので、-1してから%5して、titleから受け取ると正しい見出し内容になっている
    sheet2.getRange(1,i).setBorder(false, false, true, false, false, false);//1行目の下に枠線をつける
  }
  for (let i = 1; i < now*5 - 5; i++){
    if((i-1)%5==0){//5個区切りで最初の列のとき、その列のセルの左側に枠線をつける
      for(let j = 1; j<=4;j++){
        sheet2.getRange(j,i).setBorder(false, true, false, false, false, false);//左側に枠線をつける
      }
      sheet2.getRange(1,i).setBorder(false, true, true, false, false, false);//1行目だけ下側に枠線をつける(コード42行目の下線は47行目で上書きされて消えてしまう)
    }
  }

  const cnt = new Map();//商品名+支払い方法　の各個数を求める
  const payment_method_map = new Map();//支払い方法ごとの合計金額を求める
  const merchandise_map = new Map();//商品ごとの個数を求める

  //payment_method_mapの初期化をしておく、支払い方法ごとに合計金額が0であることを定義している
  data_payment_method.forEach(function(item){
    payment_method_map.set(item.name,0);
  });

  // シートのデータ範囲を取得
  const dataRange = sheet1.getDataRange();//シート1上でデータが入力されている範囲を取得
  const values = dataRange.getValues();//データ範囲内の全てのセルの値を2次元配列として取得

  // シート1のデータを集計していく
  for (let i = 0; i < values.length; i++) {
    let merchant_name = values[i][1];//商品名
    let pay_method_name = values[i][2];//支払い方法
    let key = merchant_name + pay_method_name;//商品名+支払い方法
    const bought_cnt = values[i][3]; //購入個数

    if (!cnt.has(key)) {//未定義ならば定義する
      cnt.set(key, 0);
    }
    cnt.set(key, cnt.get(key) + bought_cnt);//購入個数を増やす

    //merchandise_mapにも記録する
    if (!merchandise_map.has(merchant_name)) {//未定義ならば定義する
      merchandise_map.set(merchant_name, 0);
    }
    merchandise_map.set(merchant_name, merchandise_map.get(merchant_name) + bought_cnt);//購入個数を増やす

    //payment_method_mapに金額を加算する
    const item = data.find(item => item.name === merchant_name);//dataから同じ商品名のオブジェクトを取得
    payment_method_map.set(pay_method_name,payment_method_map.get(pay_method_name)+ bought_cnt*item.money);
  }


  //集計したデータをシート2に記録する
  data.forEach(function (item) {//各商品を見る
    data_payment_method.forEach(function (line_itme) {//各支払い方法を見る
      let need = item.name + line_itme.name;//商品名+支払い方法

      //cntにneedが定義されていない場合があるので、ans=0にしておいてcntに存在しているならその値を貰う
      let ans = 0;
      if (cnt.has(need)) {
        ans = cnt.get(need);
      }

      
      //シート2に記録する。{商品名,支払い方法,合計売上個数,合計金額}の順で記録する。getRange(行,列)でセルを指定する、そしてsetValueでセルに入力する内容を決める
      sheet2.getRange(line_itme.line, item.position - 4).setValue(item.name);//商品名を記録
      sheet2.getRange(line_itme.line, item.position - 3).setValue(line_itme.name);//支払い方法を記録
      sheet2.getRange(line_itme.line, item.position - 2).setValue(ans);//合計売上個数を記録
      sheet2.getRange(line_itme.line, item.position - 1).setValue(item.money * ans);//合計金額を記録
    });
  });


  data.forEach(function(item){//支払い方法を無視した商品ごとの合計個数と合計金額を求めて、上で記録した内容の2行下に記録する
    let bought_cnt = 0;//合計購入個数
    if(merchandise_map.has(item.name)){//存在しているならば貰う
      bought_cnt = merchandise_map.get(item.name);
    }

    let base_line = 6;//6行目に見出し、7行目に金額と個数を書く。列はpositionを再利用する

    //シート2に{合計販売個数,合計売上金額}を記録する
    sheet2.getRange(base_line,item.position-3).setValue(item.name + 'の合計販売個数');
    sheet2.getRange(base_line,item.position-2).setValue(item.name + 'の合計売上金額');
    sheet2.getRange(base_line+1,item.position-3).setValue(bought_cnt);
    sheet2.getRange(base_line+1,item.position-2).setValue(bought_cnt * item.money);
  });


  //支払い方法ごとの合計売上金額を求めてシート2に記録する
  let base_line = 11;//11行目に記録する
  data_payment_method.forEach(function(item){//支払方法ごとの合計金額を求める
      sheet2.getRange(base_line,1).setValue(item.name + "の合計金額");
      sheet2.getRange(base_line,2).setValue(payment_method_map.get(item.name));

      base_line++;
  });
}

function onOpen() {// スプレッドシートが開かれたときに実行してくれる関数(集計用のボタンがあるのでなくても良い)
  GetSumCnt();
}