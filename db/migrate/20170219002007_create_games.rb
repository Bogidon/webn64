class CreateGames < ActiveRecord::Migration[5.0]
  def change
    create_table :games do |t|
      t.string :name, null: false
      t.integer :players_allowed, null: false, default: 1

      t.timestamps
    end
  end
end
