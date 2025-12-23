import { defineConfig, presetAttributify, presetIcons, presetTypography, presetWind4, transformerAttributifyJsx, transformerVariantGroup } from 'unocss'

export default defineConfig({
    presets: [
        presetWind4(),
        presetAttributify({
            prefix: 'un-',
            prefixedOnly: true,
        }),
        presetIcons({
            extraProperties: {
                'display': 'inline-block',
                'vertical-align': 'middle',
            }
        }),
        presetTypography(),
    ],
    transformers: [
        transformerAttributifyJsx(),
        transformerVariantGroup(),
    ]
})
