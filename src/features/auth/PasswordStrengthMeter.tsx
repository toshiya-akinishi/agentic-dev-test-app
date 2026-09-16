/** パスワード強度インジケータ（補-6-2-1） */
import React from 'react'
import { View } from 'react-native'

import { Txt } from '../../components/ui'
import { PASSWORD_HINT, passwordStrength } from '../../lib/password'
import { colors, radius, space } from '../../theme'

const SCORE_COLOR = [colors.border, colors.danger, colors.warning, colors.success]

export const PasswordStrengthMeter = ({ password }: { password: string }) => {
  const { score, label, meetsRequirement } = passwordStrength(password)
  return (
    <View style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', gap: space.xs }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: radius.sm,
              backgroundColor: i <= score ? SCORE_COLOR[score] : colors.border,
            }}
          />
        ))}
      </View>
      <Txt size="xs" color={meetsRequirement ? colors.textSub : colors.textMuted}>
        {password.length === 0 ? PASSWORD_HINT : `強度: ${label}`}
      </Txt>
    </View>
  )
}
