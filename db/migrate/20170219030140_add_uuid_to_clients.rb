class AddUuidToClients < ActiveRecord::Migration[5.0]
  def change
    add_column :clients, :uuid, :string
  end
end
