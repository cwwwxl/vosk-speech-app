<template>
  <view class="wave-container" :class="{ active: isActive }">
    <view class="wave-bars">
      <view
        v-for="(bar, index) in bars"
        :key="index"
        class="wave-bar"
        :style="{
          height: bar.height + 'rpx',
          animationDelay: bar.delay + 's',
          animationDuration: bar.speed + 's'
        }"
        :class="{ animating: isActive }"
      />
    </view>
  </view>
</template>

<script>
export default {
  name: 'WaveAnimation',
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    barCount: {
      type: Number,
      default: 40
    },
    color: {
      type: String,
      default: '#6c5ce7'
    }
  },
  data() {
    return {
      bars: []
    }
  },
  created() {
    this.generateBars()
  },
  methods: {
    generateBars() {
      this.bars = Array.from({ length: this.barCount }, (_, i) => ({
        height: 8 + Math.random() * 12,
        delay: (i * 0.05) + Math.random() * 0.1,
        speed: 0.4 + Math.random() * 0.6
      }))
    }
  }
}
</script>

<style scoped>
.wave-container {
  width: 100%;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.wave-container.active {
  opacity: 1;
}

.wave-bars {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  height: 100%;
}

.wave-bar {
  width: 6rpx;
  background: linear-gradient(180deg, #6c5ce7, #a29bfe);
  border-radius: 4rpx;
  transition: height 0.15s ease;
}

.wave-bar.animating {
  animation: waveAnim var(--speed, 0.5s) ease-in-out infinite alternate;
}

@keyframes waveAnim {
  0% {
    height: 8rpx;
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    height: 80rpx;
    opacity: 1;
  }
}
</style>
