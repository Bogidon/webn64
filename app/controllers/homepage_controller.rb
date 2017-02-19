class HomepageController < ApplicationController
  def show
    user_uuid = cookies.signed[:uuid] ||= SecureRandom.uuid
    cookies.signed[:uuid] = user_uuid

    game_uuid = SecureRandom.uuid
    redirect_to controller: 'sessions', action: 'host', game_uuid: game_uuid
  end
end
