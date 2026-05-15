package com.vosk.uniplugin;

import android.Manifest;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import com.alibaba.fastjson.JSONObject;

import org.vosk.Model;
import org.vosk.Recognizer;
import org.vosk.android.StorageService;

import java.io.IOException;

import io.dcloud.feature.uniapp.annotation.UniJSMethod;
import io.dcloud.feature.uniapp.bridge.UniJSCallback;
import io.dcloud.feature.uniapp.common.UniModule;

/**
 * Vosk 离线语音识别 UniApp 原生插件 (Android)
 *
 * 功能：
 * 1. 加载 Vosk 离线语音模型
 * 2. 实时录音并进行语音识别
 * 3. 返回中间结果和最终结果
 *
 * 使用方法：
 *   const vosk = uni.requireNativePlugin('Vosk-SpeechRecognition')
 *   vosk.loadModel({ modelPath: 'vosk-model-small-cn-0.22' }, callback)
 *   vosk.startRecognition({ sampleRate: 16000 }, resultCallback)
 *   vosk.stopRecognition({}, callback)
 *   vosk.release({}, callback)
 */
public class VoskModule extends UniModule {

    private static final String TAG = "VoskModule";
    private static final int SAMPLE_RATE = 16000;

    private Model model;
    private Recognizer recognizer;
    private AudioRecord audioRecord;
    private Thread recordingThread;
    private volatile boolean isRecording = false;
    private UniJSCallback recognitionCallback;

    /**
     * 加载 Vosk 语音模型
     * @param options { modelPath: string, sampleRate?: number }
     * @param callback 回调 { code: 0|1, message: string }
     */
    @UniJSMethod(uiThread = false)
    public void loadModel(JSONObject options, final UniJSCallback callback) {
        String modelPath = options.getString("modelPath");
        if (modelPath == null || modelPath.isEmpty()) {
            modelPath = "vosk-model-small-cn-0.22";
        }

        final String finalModelPath = modelPath;

        try {
            // 从 assets 目录加载模型
            StorageService.unpack(mUniSDKInstance.getContext(), finalModelPath,
                    "model",
                    (Model m) -> {
                        model = m;
                        JSONObject result = new JSONObject();
                        result.put("code", 0);
                        result.put("message", "模型加载成功");
                        if (callback != null) callback.invoke(result);
                    },
                    (IOException e) -> {
                        JSONObject result = new JSONObject();
                        result.put("code", 1);
                        result.put("message", "模型加载失败: " + e.getMessage());
                        if (callback != null) callback.invoke(result);
                    }
            );
        } catch (Exception e) {
            Log.e(TAG, "加载模型异常", e);
            JSONObject result = new JSONObject();
            result.put("code", 1);
            result.put("message", "模型加载异常: " + e.getMessage());
            if (callback != null) callback.invoke(result);
        }
    }

    /**
     * 开始语音识别
     * @param options { language?: string, sampleRate?: number, continuous?: boolean }
     * @param callback 持续回调 { type: 'partial'|'result'|'error', text: string }
     */
    @UniJSMethod(uiThread = false)
    public void startRecognition(JSONObject options, final UniJSCallback callback) {
        if (model == null) {
            JSONObject error = new JSONObject();
            error.put("type", "error");
            error.put("message", "模型未加载，请先调用 loadModel");
            if (callback != null) callback.invokeAndKeepAlive(error);
            return;
        }

        if (isRecording) {
            JSONObject error = new JSONObject();
            error.put("type", "error");
            error.put("message", "正在录音中");
            if (callback != null) callback.invokeAndKeepAlive(error);
            return;
        }

        // 检查录音权限
        if (ActivityCompat.checkSelfPermission(mUniSDKInstance.getContext(),
                Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            JSONObject error = new JSONObject();
            error.put("type", "error");
            error.put("message", "未获得录音权限");
            if (callback != null) callback.invokeAndKeepAlive(error);
            return;
        }

        int sampleRate = options.getIntValue("sampleRate");
        if (sampleRate <= 0) sampleRate = SAMPLE_RATE;

        recognitionCallback = callback;

        try {
            recognizer = new Recognizer(model, sampleRate);
            recognizer.setWords(true);

            int bufferSize = AudioRecord.getMinBufferSize(
                    sampleRate,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT
            );

            audioRecord = new AudioRecord(
                    MediaRecorder.AudioSource.VOICE_RECOGNITION,
                    sampleRate,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    bufferSize
            );

            isRecording = true;
            audioRecord.startRecording();

            // 在子线程中持续读取音频数据并识别
            recordingThread = new Thread(() -> {
                byte[] buffer = new byte[bufferSize];

                while (isRecording) {
                    int readBytes = audioRecord.read(buffer, 0, buffer.length);
                    if (readBytes > 0) {
                        boolean isFinal = recognizer.acceptWaveForm(buffer, readBytes);
                        JSONObject result = new JSONObject();

                        if (isFinal) {
                            String text = recognizer.getResult();
                            result.put("type", "result");
                            result.put("text", extractText(text));
                        } else {
                            String partial = recognizer.getPartialResult();
                            result.put("type", "partial");
                            result.put("text", extractPartial(partial));
                        }

                        if (recognitionCallback != null && result.getString("text") != null
                                && !result.getString("text").isEmpty()) {
                            recognitionCallback.invokeAndKeepAlive(result);
                        }
                    }
                }

                // 获取最后的结果
                if (recognizer != null) {
                    String finalResult = recognizer.getFinalResult();
                    JSONObject result = new JSONObject();
                    result.put("type", "result");
                    result.put("text", extractText(finalResult));
                    if (recognitionCallback != null && result.getString("text") != null
                            && !result.getString("text").isEmpty()) {
                        recognitionCallback.invokeAndKeepAlive(result);
                    }
                }
            });

            recordingThread.start();

        } catch (Exception e) {
            Log.e(TAG, "启动识别失败", e);
            isRecording = false;
            JSONObject error = new JSONObject();
            error.put("type", "error");
            error.put("message", "启动识别失败: " + e.getMessage());
            if (callback != null) callback.invokeAndKeepAlive(error);
        }
    }

    /**
     * 停止语音识别
     */
    @UniJSMethod(uiThread = false)
    public void stopRecognition(JSONObject options, final UniJSCallback callback) {
        isRecording = false;

        if (recordingThread != null) {
            try {
                recordingThread.join(3000);
            } catch (InterruptedException e) {
                Log.e(TAG, "等待录音线程结束异常", e);
            }
            recordingThread = null;
        }

        if (audioRecord != null) {
            try {
                audioRecord.stop();
                audioRecord.release();
            } catch (Exception e) {
                Log.e(TAG, "释放 AudioRecord 异常", e);
            }
            audioRecord = null;
        }

        if (recognizer != null) {
            recognizer.close();
            recognizer = null;
        }

        JSONObject result = new JSONObject();
        result.put("code", 0);
        result.put("message", "已停止");
        if (callback != null) callback.invoke(result);
    }

    /**
     * 释放所有资源
     */
    @UniJSMethod(uiThread = false)
    public void release(JSONObject options, final UniJSCallback callback) {
        stopRecognition(new JSONObject(), null);

        if (model != null) {
            model.close();
            model = null;
        }

        JSONObject result = new JSONObject();
        result.put("code", 0);
        result.put("message", "已释放");
        if (callback != null) callback.invoke(result);
    }

    // 从 Vosk JSON 结果中提取文字
    private String extractText(String json) {
        try {
            JSONObject obj = JSONObject.parseObject(json);
            return obj.getString("text");
        } catch (Exception e) {
            return "";
        }
    }

    // 从 Vosk JSON 部分结果中提取文字
    private String extractPartial(String json) {
        try {
            JSONObject obj = JSONObject.parseObject(json);
            return obj.getString("partial");
        } catch (Exception e) {
            return "";
        }
    }

    @Override
    public void destroy() {
        release(new JSONObject(), null);
        super.destroy();
    }
}
