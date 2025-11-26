import { YStack, Text, Button, Theme } from 'tamagui'

export function TamaguiTest() {
  return (
    <Theme name="dark">
      <YStack
        f={1}
        jc="center"
        ai="center"
        backgroundColor="background"
        padding="$4"
      >
        <Text fontSize="$6" color="$color" mb="$4">
          Tamagui 安装成功! 🎉
        </Text>
        <Button
          size="$4"
          theme="active"
          onPress={() => alert('Tamagui 按钮点击!')}
        >
          测试按钮
        </Button>
      </YStack>
    </Theme>
  )
}