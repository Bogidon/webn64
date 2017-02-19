class ClientChannel < ApplicationCable::Channel
  def subscribed
    game_session = GameSession.find(params[:game_session_id]) if params[:game_session_id]
    game_session ||= GameSession.create(game_id: 1, host_id: 1)
    stream_for game_session
  end

  def receive(data)
    game_session = GameSession.find(params[:game_session_id]) if params[:game_session_id]
    game_session ||= GameSession.create(game_id: 1, host_id: 1)
    ActionCable.server.broadcast(game_session, data)
  end
end
