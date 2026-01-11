/**
 * Supabaseのエラーメッセージを日本語に翻訳する関数
 */
export function translateSupabaseError(errorMessage: string): string {
  // 現場コードの重複エラー
  if (
    errorMessage.includes('duplicate key value') &&
    errorMessage.includes('field_code')
  ) {
    return 'この現場コードは既に使用されています。別のコードを入力してください。'
  }

  // RLSポリシー違反
  if (errorMessage.includes('violates row-level security policy')) {
    return '権限エラーが発生しました。ログインし直してください。'
  }

  // 外部キー制約違反（削除時 - 関連データが存在する）
  if (
    errorMessage.includes('violates foreign key constraint') ||
    errorMessage.includes('update or delete on table')
  ) {
    if (errorMessage.includes('fields') || errorMessage.includes('field_id')) {
      return 'この現場には関連する案件が存在するため削除できません。先に案件を削除してください。'
    }
    if (errorMessage.includes('projects') || errorMessage.includes('project_id')) {
      return 'この案件には関連する作業日や経費が存在するため削除できません。'
    }
    return '関連するデータが存在するため削除できません。'
  }

  // 外部キー制約違反（登録時 - 参照先が存在しない）
  if (errorMessage.includes('foreign key constraint')) {
    return '関連するデータが見つかりません。データを確認してください。'
  }

  // NOT NULL制約違反
  if (errorMessage.includes('null value in column')) {
    return '必須項目が入力されていません。'
  }

  // 一般的なデータベースエラー
  if (errorMessage.includes('violates check constraint')) {
    return '入力されたデータが制約に違反しています。値を確認してください。'
  }

  // その他のエラーはそのまま返す（デバッグ用）
  return errorMessage
}
