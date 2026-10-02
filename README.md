# 碧の設計図

mitsulab の案内役・碧（あおい）の中身を、3D で見るアプリです。試作なので、内容は予告なく変わります。

**開く**：https://mitsulab-soil.github.io/aoi-blueprint/

碧は道具ではなく、人と自然のあいだの通訳です。その中身は、いまある技術の組み合わせです。
体を押すと中が透けて、耳・目・足もと・胸・手・頭・背中の部品が見えます。部品を選ぶと、その技術で人と自然のどんな関係が見えるかを碧が短く話し、その技術で**移せないもの（限界）**も一行で示します。

| 部品 | 技術 | 移せないもの |
|---|---|---|
| 耳の葉（Phono-Qualia） | マイク・振動のセンサー、ヘテロダイン・ゆっくり再生で高さを下げる | 音で形をとらえる感じ方そのもの。録れる帯は機材しだい |
| 目（Photo-Qualia） | 紫外線カメラ・分光・偽色 | 虫にどう見えているかという主観 |
| 足もと（Geo-Qualia） | LiDAR・国土地理院の 5 m 標高（DEM5A） | 歩く体が感じる勾配の重さ。5 m より細かい起伏 |
| 胸（Bio-／Logo-Qualia） | 市民科学の観察記録（iNaturalist）・典拠の台帳 | 記録されなかった生きもの。書き手の体験 |
| 手（Pedo-Qualia） | 土の DNA を読む解析・食物網の模式 | 土の中の時間と化学。DNA があっても生きているとは限らない |
| 頭（ことば） | 大規模言語モデル（AI） | 感覚と気持ち |
| 背中のしるし | mitsulab のしるし（機能はない） | — |

- 中の部品は、碧の働きを体の場所に割りあてて描いた**見取り図**です。3D の碧の中に機械が入っているわけではありません。
- 碧は mitsulab が AI で動かしている案内役です。越えない線：断定しない／典拠のない事実を作らない／AI であることを隠さない／生きものの気持ちを代弁しない・場所を診断しない。
- この画面の碧の言葉は、あらかじめ書いて確かめた文です。会話の欄はなく、何も送りません（保存も学習もしません）。
- 足もとの格子の起伏は模式で、高さを強調しています。

## つかいかた

ドラッグ・スワイプで回す／体を押すと中が見える／部品の名前か、体の中の部品を押して選ぶ／札を左右にスワイプ（PC は ← →）で前・次へ。

## 使っているもの

- [three.js](https://threejs.org/) 0.170.0（MIT）・[@pixiv/three-vrm](https://github.com/pixiv/three-vrm) 3.5.5（MIT）を jsDelivr から読み込み
- 碧の 3D（VRM）は mitsulab の制作物です。ほかの用途への転用はご遠慮ください。

関連：[《Feel Hikawa》](https://mitsulab-soil.github.io/aoi-walk-hikawa/)・[氷川重奏](https://mitsulab-soil.github.io/HIKAWA-ENSEMBLE/)・[森羅百景](https://mitsulab-soil.github.io/shinra-hyakkei/)・[土の微生物の顔ぶれ](https://mitsulab-soil.github.io/soil-metagenomics-topography-correlation/)・[土の中のつながり](https://mitsulab-soil.github.io/Soil-Ecosystem-ANT-Simulator/)

© mitsulab — https://mitsulab.jp
