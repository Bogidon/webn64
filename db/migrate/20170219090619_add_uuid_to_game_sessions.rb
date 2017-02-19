class AddUuidToGameSessions < ActiveRecord::Migration[5.0]
  def change
    add_column :game_sessions, :uuid, :string
  end
end
