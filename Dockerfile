FROM node:20-slim

# Angular CLIをグローバルにインストール
RUN npm install -g @angular/cli

WORKDIR /app

# コンテナが立ち上がり続けるように設定
CMD ["tail", "-f", "/dev/null"]