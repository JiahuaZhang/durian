import { defineConfig, presetAttributify, presetIcons, presetTypography, presetWind4 } from 'unocss'

export default defineConfig({
    presets: [
        presetWind4(),
        presetAttributify(),
        presetIcons({
            extraProperties: {
                'display': 'inline-block',
                'vertical-align': 'middle',
            }
        }),
        presetTypography(),
    ],
})
