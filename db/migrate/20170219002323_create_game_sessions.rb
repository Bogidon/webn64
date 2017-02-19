class CreateGameSessions < ActiveRecord::Migration[5.0]
  def change
    create_table :game_sessions do |t|
      t.string :game_id, null: false
      t.integer :host_id, null: false
      t.integer :players_connected, null: false, default: 1

      t.timestamps
    end
  end
end
