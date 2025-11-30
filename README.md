# TidalDL-Web (High-Res Music Downloader & Player)
TidalDL-Web 是一个基于 Python (FastAPI) 后端和原生 JavaScript 前端的 Web 应用程序。它允许用户搜索 TIDAL 曲库、在线播放以及下载最高达 Hi-Res / Master 音质的无损音乐。

> **⚠️ 免责声明 / Disclaimer**
> 本项目仅供学习和技术研究使用。请支持正版音乐，下载的内容请在 24 小时内删除。严禁将本项目用于任何商业用途。
> This project is for educational and technical research purposes only. Please support official music services.

## ✨ 功能特性
* **高音质下载**：支持 Hi-Res Lossless (FLAC) 和 Dolby Atmos (若账号支持) 下载。
* **元数据完善**：自动写入封面、歌手、专辑、歌词、ISRC 等 ID3 标签。
* **Web 播放器**：内置 HTML5 播放器，支持在线试听。
* **灵活搜索**：支持按歌曲、专辑、歌手、播放列表搜索。
* **跨平台**：基于 Web 技术，支持通过浏览器（需支持 File System Access API，如 Chrome/Edge）直接保存文件到本地。
* **本地缓存**：支持断点续传和磁盘缓存。

## 🛠️ 目录结构

在使用前，请确保你的文件目录结构如下：
```text
TidalDL-Web/
├── main.py              # 后端入口文件
├── login.py             # 登录 Tidal 获取 Token 脚本
├── token.json           # (运行 login.py 授权后自动生成)
├── requirements.txt     # 依赖列表
└── static/              # 前端静态资源文件夹
    ├── index.html       # Web 主页
    ├── css/
    │   └── style.css
    └── js/
        ├── app.js
        ├── modules/     # JS 模块
        │   ├── api.js
        │   ├── dom.js
        │   ├── downloader.js
        │   ├── ffmpeg.js
        │   ├── player.js
        │   ├── settings.js
        │   ├── ui.js
        │   └── utils.js
```
## 🚀 安装依赖
```text
pip install -r requirements.txt
```
## 🔑 登录Tidal并授权
* 打开 login.py 输入 token.json 的绝对路径，路径应在 main.py 同目录下比如：
* SESSION_FILE = Path("/root/Tidal-Web-Downloader-main/token.json")
* 然后运行：
```text
python login.py
```
## ▶️ 运行项目
```text
python main.py
```
## 📜 许可证 (License)
本项目采用 CC BY-NC 4.0 许可证。 您可以自由地：分享、修改、学习。 严禁用于商业用途。详情请见 LICENSE 文件。
