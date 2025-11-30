// js/modules/ffmpeg.js

import { settingsManager } from './settings.js';
import { updateDownloadManagerStatus } from './ui.js';

const { createFFmpeg } = FFmpeg;
let ffmpeg = null;
let ffmpegLoadPromise = null;

export async function loadFFmpeg() {
    if (window.electronAPI) return;

    if (ffmpeg && ffmpeg.isLoaded()) {
        return;
    }

    if (ffmpegLoadPromise) {
        await ffmpegLoadPromise;
        return;
    }

    if (!window.FFmpeg) {
        updateDownloadManagerStatus({ trackStatus: 'FFmpeg 库主文件加载失败', autoHide: true });
        return;
    }

    ffmpegLoadPromise = (async () => {
        updateDownloadManagerStatus({ trackStatus: '正在加载 FFmpeg...' });
        ffmpeg = createFFmpeg({
            log: true,
            corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
        });
        await ffmpeg.load();
        updateDownloadManagerStatus({ trackStatus: 'FFmpeg 准备就绪', autoHide: true });
    })();

    await ffmpegLoadPromise;
}

export async function mergeHiresSegments(segmentBuffers) {
    if (!ffmpeg || !ffmpeg.isLoaded()) {
        console.log('FFmpeg not ready, skipping merge.');
        throw new Error('FFmpeg not loaded');
    }
    updateDownloadManagerStatus({ trackStatus: `正在合并 ${segmentBuffers.length} 个分片...` });

    try {
        console.log("步骤 1: 在内存中物理拼接所有分片...");
        const totalSize = segmentBuffers.reduce((acc, buffer) => acc + buffer.byteLength, 0);
        const combinedBuffer = new Uint8Array(totalSize);
        let offset = 0;
        for (const buffer of segmentBuffers) {
            combinedBuffer.set(new Uint8Array(buffer), offset);
            offset += buffer.byteLength;
        }
        await ffmpeg.FS('writeFile', 'combined.m4a', combinedBuffer);
        console.log("成功在虚拟文件系统创建 combined.m4a。");

        console.log("步骤 2: 调用 FFmpeg 从 combined.m4a 提取音频...");
        const outputFilename = 'output.flac';
        await ffmpeg.run(
            '-y',
            '-i', 'combined.m4a',
            '-c:a', 'copy',
            '-strict', '-2',
            outputFilename
        );

        const outputData = ffmpeg.FS('readFile', outputFilename);
        
        try {
             ffmpeg.FS('unlink', 'combined.m4a');
             ffmpeg.FS('unlink', outputFilename);
        } catch(e){}

        console.log("FFmpeg 处理成功！");
        return outputData.buffer;

    } catch (error) {
        console.error('Error merging segments in browser:', error);
        updateDownloadManagerStatus({ trackStatus: 'Hi-Res 分片合并失败！'});
        throw error;
    }
}


export async function applyMetadata(trackBuffer, trackInfo) {
    if (window.electronAPI) {
        try {
            const coverUrl = `https://resources.tidal.com/images/${(trackInfo.album?.cover || '').replace(/-/g, '/')}/1280x1280.jpg`;
            const coverRes = await fetch(coverUrl);
            const albumArtBuffer = coverRes.ok ? await coverRes.arrayBuffer() : null;
            const metadata = {};
            const fields = settingsManager.config.metadataFields;
            if(fields.title) metadata.title = trackInfo.title;
            if(fields.artist) metadata.artist = (trackInfo.artists || []).map(a => a.name).join('/');
            if(fields.album_artist) metadata.album_artist = trackInfo.album?.artist?.name || (trackInfo.artists || []).map(a => a.name).join('/');
            if(fields.album) metadata.album = trackInfo.album?.title;
            if(fields.track && trackInfo.album?.numberOfTracks) metadata.track = `${trackInfo.trackNumber || ''}/${trackInfo.album.numberOfTracks}`;
            if(fields.disc && trackInfo.volumeNumber) {
                const totalDiscs = trackInfo.album?.numberOfVolumes;
                metadata.disc = totalDiscs ? `${trackInfo.volumeNumber}/${totalDiscs}` : `${trackInfo.volumeNumber}`;
            }
            if(fields.date) metadata.date = trackInfo.album?.releaseDate;
            if(fields.copyright) metadata.copyright = trackInfo.copyright;
            if(fields.isrc) metadata.isrc = trackInfo.isrc;
            if(fields.lyrics && trackInfo.lyrics) metadata.lyrics = trackInfo.lyrics;

            const result = await window.electronAPI.applyMetadataNative({
                trackBuffer,
                metadata,
                albumArtBuffer,
                trackId: trackInfo.id
            });
            
            if (result.success) return result.data;
            throw new Error(result.error);
        } catch (error) {
            console.error('Error applying metadata via native API:', error);
            updateDownloadManagerStatus({ trackStatus: '原生元数据写入失败！将下载原始文件'});
            return trackBuffer;
        }
    }

    if (!ffmpeg || !ffmpeg.isLoaded()) {
        console.log('FFmpeg not ready, skipping metadata.');
        return trackBuffer;
    }
    updateDownloadManagerStatus({ trackStatus: '正在写入元数据...' });
    const inputFilename = 'input.flac', outputFilename = 'output.flac', metadataFilename = 'metadata.txt', coverFilename = 'albumArt.jpg';
    const tempFiles = [inputFilename, outputFilename, metadataFilename, coverFilename];
    try {
        await ffmpeg.FS('writeFile', inputFilename, new Uint8Array(trackBuffer));
        const coverUrl = `https://resources.tidal.com/images/${(trackInfo.album?.cover || '').replace(/-/g, '/')}/1280x1280.jpg`;
        const coverRes = await fetch(coverUrl);
        if (!coverRes.ok) throw new Error('Failed to fetch cover art for metadata');
        const coverBuffer = await coverRes.arrayBuffer();
        await ffmpeg.FS('writeFile', coverFilename, new Uint8Array(coverBuffer));

        let metadataStr = ';FFMETADATA1\n';
        const addMeta = (key, value) => {
            const val = value || '';
            if (String(val).trim() !== '') {
                const escapedValue = String(val).replace(/([\\;#=])/g, '\\$1').replace(/\n/g, '\\\n');
                metadataStr += `${key}=${escapedValue}\n`;
            }
        };

        const fields = settingsManager.config.metadataFields;
        if(fields.title) addMeta('title', trackInfo.title);
        if(fields.artist) addMeta('artist', (trackInfo.artists || []).map(a => a.name).join('/'));
        if(fields.album_artist) addMeta('album_artist', trackInfo.album?.artist?.name || (trackInfo.artists || []).map(a => a.name).join('/'));
        if(fields.album) addMeta('album', trackInfo.album?.title);
        if(fields.track && trackInfo.album?.numberOfTracks) addMeta('track', `${trackInfo.trackNumber || ''}/${trackInfo.album.numberOfTracks}`);
        
        if(fields.disc && trackInfo.volumeNumber) {
            const totalDiscs = trackInfo.album?.numberOfVolumes;
            const discValue = totalDiscs ? `${trackInfo.volumeNumber}/${totalDiscs}` : `${trackInfo.volumeNumber}`;
            addMeta('disc', discValue);
        }

        if(fields.date) addMeta('date', trackInfo.album?.releaseDate);
        if(fields.copyright) addMeta('copyright', trackInfo.copyright);
        if(fields.isrc) addMeta('isrc', trackInfo.isrc);
        if(fields.lyrics && trackInfo.lyrics) addMeta('lyrics', trackInfo.lyrics);

        await ffmpeg.FS('writeFile', metadataFilename, metadataStr);

        await ffmpeg.run(
            '-i', inputFilename, '-i', coverFilename, '-i', metadataFilename,
            '-map', '0:a', '-map', '1:v', '-map_metadata', '2',
            '-c', 'copy', '-disposition:v', 'attached_pic',
            outputFilename
        );
        const outputData = ffmpeg.FS('readFile', outputFilename);
        return outputData.buffer;
    } catch (error) {
        console.error('Error applying metadata:', error);
        updateDownloadManagerStatus({ trackStatus: '元数据写入失败！将下载原始文件'});
        return trackBuffer;
    } finally {
        tempFiles.forEach(file => { try { ffmpeg.FS('unlink', file); } catch(e) {} });
    }
}