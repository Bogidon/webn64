class CreateGameSessionClients < ActiveRecord::Migration[5.0]
  def change
    create_table :game_session_clients do |t|
      t.integer :game_session_id, null: false
      t.integer :client_id, null: false

      t.timestamps
    end
  end
end
