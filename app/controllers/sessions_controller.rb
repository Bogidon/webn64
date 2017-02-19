class SessionsController < ApplicationController

  def host
    game_uuid = params[:game_uuid]
    puts game_uuid
    GameSession.create(uuid: game_uuid, game_id: 1, host_id: 1)
    @game_uuid = game_uuid
    gon.game_uuid = game_uuid
  end

  def client
    game_uuid = params[:game_uuid]
    game_session = GameSession.find_by(uuid: game_uuid)
    player_order = game_session.players_connected + 1
    game_session.players_connected += 1
    game_session.save!
    gon.push({
      game_uuid: game_uuid,
      player_order: player_order,
    })
  end
end
